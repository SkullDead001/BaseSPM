const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const util = require('util');
const { execFile } = require('child_process');
const axios = require('axios');

const execFilePromise = util.promisify(execFile);

module.exports = {
  name: 'mp3',
  alias: ['audio', 'ytaudio'],
  description: 'Descarga MP3 desde YouTube (link o búsqueda)',
  noCooldown: true,

  async exec({ sock, message, args, state, saveState }) {
    const jid = message?.key?.remoteJid;
    const sender = message?.key?.participant || jid;
    if (!jid || !sender) return;

    state.activeDownloads ??= [];

    if (!args?.length) {
      await sock.sendMessage(jid, {
        text: '⚠️ Uso correcto:\n.mp3 <link>\n.mp3 <búsqueda>'
      });
      return;
    }

    if (state.activeDownloads.includes(sender)) {
      await sock.sendMessage(jid, {
        text: '⏳ *Ya tienes una descarga en curso.*\nEspera a que termine.'
      });
      return;
    }

    // 🔒 BLOQUEAR
    state.activeDownloads.push(sender);
    await saveState();

    let filePath = null;

    try {
      const input = args.join(' ');
      let url = '';
      let title = 'audio';

      // ========================
      // 🔗 LINK DIRECTO
      // ========================
      if (input.startsWith('http')) {
        url = input;

        await sock.sendMessage(jid, {
          text: '🎧 *Descargando audio…*\n_Esto puede tardar un momento_'
        });
      }

      // ========================
      // 🔍 BÚSQUEDA YOUTUBE
      // ========================
      else {
        const apisPath = path.join(__dirname, '../api/apis.json');
        const apis = JSON.parse(await fs.readFile(apisPath, 'utf8'));

        if (!apis.youtube) {
          throw new Error('API de YouTube no configurada.');
        }

        const searchUrl =
          `https://www.googleapis.com/youtube/v3/search` +
          `?part=snippet&type=video&maxResults=1` +
          `&q=${encodeURIComponent(input)}` +
          `&key=${apis.youtube}`;

        const res = await axios.get(searchUrl);

        if (!res.data.items?.length) {
          throw new Error('No se encontraron resultados.');
        }

        const video = res.data.items[0];
        url = `https://www.youtube.com/watch?v=${video.id.videoId}`;
        title = video.snippet.title.replace(/[<>:"/\\|?*]/g, '');

        await sock.sendMessage(jid, {
          text: `🎵 *${title}*\n🔗 ${url}\n_Descargando audio…_`
        });
      }

      // ========================
      // 🐍 PYTHON DOWNLOADER
      // ========================
      const scriptPath = path.join(
        __dirname,
        '../python/download-audio.py'
      );

      const downloadsDir = path.join(
        __dirname,
        '../../data/downloads/audio'
      );

      await fs.mkdir(downloadsDir, { recursive: true });

      const { stdout, stderr } = await execFilePromise(
        'python3',
        [scriptPath, url, downloadsDir],
        { timeout: 1000 * 60 * 10 }
      );

      if (stderr && /403|challenge|error/i.test(stderr)) {
        throw new Error('YouTube bloqueó la descarga.');
      }

      filePath = stdout
        .split('\n')
        .map(l => l.trim())
        .find(l => l.endsWith('.mp3'));

      if (!filePath || !fsSync.existsSync(filePath)) {
        throw new Error('No se pudo generar el archivo de audio.');
      }

      // ========================
      // 📤 ENVIAR AUDIO
      // ========================
      await sock.sendMessage(jid, {
        audio: { url: filePath },
        mimetype: 'audio/mpeg',
        ptt: false
      });

    } catch (err) {
      console.error('[MP3 ERROR]', err);

      await sock.sendMessage(jid, {
        text: `❌ Error:\n${err.message}`
      });

    } finally {
      // 🧹 Limpiar archivo
      if (filePath) {
        setTimeout(() => {
          fs.unlink(filePath).catch(() => {});
        }, 5000);
      }

      // 🔓 LIBERAR SIEMPRE
      state.activeDownloads = state.activeDownloads.filter(
        u => u !== sender
      );

      await saveState();
    }
  }
};
