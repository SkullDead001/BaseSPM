const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const util = require('util');
const { execFile } = require('child_process');

const execFilePromise = util.promisify(execFile);

module.exports = {
  name: 'mp4',
  alias: ['video', 'ytmp4'],
  description: 'Descarga un video desde una URL y lo envía al chat.',
  noCooldown: true,

  async exec({ sock, message, args, state, saveState }) {
    const jid = message?.key?.remoteJid;
    const sender = message?.key?.participant || jid;
    if (!jid || !sender) return;

    state.activeDownloads ??= [];

    if (!args.length || !args[0].startsWith('http')) {
      await sock.sendMessage(
        jid,
        { react: { text: '⚠️', key: message.key } },
        { quoted: message }
      );
      return;
    }

    if (state.activeDownloads.includes(sender)) {
      await sock.sendMessage(
        jid,
        { react: { text: '⏳', key: message.key } },
        { quoted: message }
      );
      return;
    }

    const url = args[0];
    let filePath = null;

    // 🔒 BLOQUEAR
    state.activeDownloads.push(sender);
    await saveState();

    try {
      await sock.sendMessage(
        jid,
        { react: { text: '📥', key: message.key } },
        { quoted: message }
      );

      const scriptPath = path.join(
        __dirname,
        '../../src/python/download-video.py'
      );

      const downloadsDir =
        state.config?.DOWNLOADS_DIR ||
        path.join(__dirname, '../../data/downloads/video');

      await fs.mkdir(downloadsDir, { recursive: true });

      const { stdout, stderr } = await execFilePromise(
        'python3',
        [scriptPath, url, downloadsDir],
        { timeout: 1000 * 60 * 15 }
      );

      // Detectar bloqueo YouTube
      if (stderr && /403|challenge|signature/i.test(stderr)) {
        throw new Error('YouTube bloqueó la descarga (protección anti-bots).');
      }

      filePath = stdout
        .split('\n')
        .map(l => l.trim())
        .find(l => l.endsWith('.mp4'));

      if (!filePath || !fsSync.existsSync(filePath)) {
        throw new Error('No se generó un archivo MP4 válido.');
      }

      // 📤 Enviar video
      await sock.sendMessage(
        jid,
        {
          video: { url: filePath },
          caption: '* *Dᴇsᴄᴀʀɢᴀ ғɪɴᴀʟɪᴢᴀᴅᴀ*\n> Aᴏ̨ᴜɪ ᴛɪᴇɴᴇs'
        },
        { quoted: message }
      );

      await sock.sendMessage(
        jid,
        { react: { text: '📌', key: message.key } },
        { quoted: message }
      );

    } catch (error) {
      console.error('[MP4-Error]', error);

      await sock.sendMessage(
        jid,
        { react: { text: '❌', key: message.key } },
        { quoted: message }
      );

      await sock.sendMessage(
        jid,
        { text: `❌ Error: ${error.message}` },
        { quoted: message }
      );

    } finally {
      // 🔓 LIBERAR SIEMPRE
      state.activeDownloads = state.activeDownloads.filter(
        u => u !== sender
      );
      await saveState();

      // 🧹 Eliminar archivo después de enviar
      if (filePath) {
        setTimeout(() => {
          fs.unlink(filePath).catch(() => {});
        }, 5000);
      }
    }
  }
};
