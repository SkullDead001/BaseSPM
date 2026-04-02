// src/commands/lib-yt4-audio.js

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const util = require('util');
const { execFile } = require('child_process');
const axios = require('axios');

const execFilePromise = util.promisify(execFile);

module.exports = {
  name: 'yt3',
  alias: ['yt-mp3', 'ytmp3'],
  description: 'Busca en YouTube y envía el audio',
  noCooldown: true,

  exec: async ({ sock, message, args, state, saveState }) => {
    const jid = message?.key?.remoteJid;
    const sender = message?.key?.participant || jid;
    if (!jid || !sender) return;

    state.activeDownloads ??= [];

    if (!args.length) {
      await sock.sendMessage(jid, {
        text: '❌ Uso correcto:\n`.yt3 nombre de la canción`'
      });
      return;
    }

    if (state.activeDownloads.includes(sender)) {
      await sock.sendMessage(jid, {
        text: '⏳ Ya tienes una descarga en curso.'
      });
      return;
    }

    // 🔒 BLOQUEO
    state.activeDownloads.push(sender);
    await saveState();

    let filePath = null;

    try {
      const query = args.join(' ');

      // 🔍 Buscar video
      const apisPath = path.join(__dirname, '../api/apis.json');
      const apis = JSON.parse(await fsp.readFile(apisPath, 'utf8'));
      if (!apis.youtube) throw new Error('API de YouTube no configurada.');

      const searchUrl =
        `https://www.googleapis.com/youtube/v3/search` +
        `?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}` +
        `&key=${apis.youtube}`;

      const { data } = await axios.get(searchUrl);
      if (!data.items?.length) throw new Error('No se encontraron resultados.');

      const v = data.items[0];
      const title = v.snippet.title.replace(/[<>:"/\\|?*]/g, '');
      const channel = v.snippet.channelTitle;
      const videoUrl = `https://www.youtube.com/watch?v=${v.id.videoId}`;

      await sock.sendMessage(jid, {
        text:
`🎵 *${title}*
👤 ${channel}
🔗 ${videoUrl}

⏳ Descargando audio…`
      });

      // 🐍 Python
      const scriptPath = path.join(__dirname, '../../src/python/download-audio.py');
      const downloadsDir = path.join(__dirname, '../../data/downloads/audio');
      await fsp.mkdir(downloadsDir, { recursive: true });

      const { stdout, stderr } = await execFilePromise(
        'python3',
        [scriptPath, videoUrl, downloadsDir],
        { timeout: 1000 * 60 * 10 }
      );

      if (stderr && /403|challenge|signature/i.test(stderr)) {
        throw new Error('YouTube bloqueó la descarga.');
      }

      filePath = stdout
        .split('\n')
        .map(l => l.trim())
        .find(l => l.endsWith('.mp3'));

      if (!filePath || !fs.existsSync(filePath)) {
        throw new Error('No se pudo generar el audio.');
      }

      await sock.sendMessage(jid, {
        document: { url: filePath },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        caption: `🎵 *${title}*\n👤 ${channel}`
      });

    } catch (err) {
      console.error('[YT3 ERROR]', err);
      await sock.sendMessage(jid, {
        text: `❌ Error:\n${err.message}`
      });

    } finally {
      // 🧹 BORRAR ARCHIVO
      if (filePath) {
        setTimeout(() => {
          fsp.unlink(filePath).catch(() => {});
        }, 4000);
      }

      // 🔓 LIBERAR BLOQUEO SIEMPRE
      state.activeDownloads = state.activeDownloads.filter(u => u !== sender);
      await saveState();
    }
  }
};
