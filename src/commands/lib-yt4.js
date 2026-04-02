// src/commands/lib-yt4-video.js

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const util = require('util');
const { execFile } = require('child_process');
const axios = require('axios');

const execFilePromise = util.promisify(execFile);

module.exports = {
  name: 'yt4',
  alias: ['youtube'],
  description: 'Busca en YouTube, descarga el video y lo envía.',
  noCooldown: true,

  exec: async ({ sock, message, args, state, saveState }) => {
    const jid = message?.key?.remoteJid;
    const sender = message?.key?.participant || jid;
    if (!jid || !sender) return;

    state.activeDownloads ??= [];

    if (!args.length) {
      await sock.sendMessage(jid, {
        text:
`* ⚠️ ᴜsᴏ ɪɴᴄᴏʀʀᴇᴄᴛᴏ *

> ᴜsᴀ:
* *.yt4 <ʙᴜ́sǫᴜᴇᴅᴀ>*`
      });
      return;
    }

    if (state.activeDownloads.includes(sender)) {
      await sock.sendMessage(jid, {
        text:
`* ⚠️ ᴅᴇsᴄᴀʀɢᴀ ᴇɴ ᴘʀᴏᴄᴇsᴏ *

> ᴇsᴘᴇʀᴀ ᴀ ǫᴜᴇ ᴛᴇʀᴍɪɴᴇ ʟᴀ ᴅᴇsᴄᴀʀɢᴀ ᴀɴᴛᴇʀɪᴏʀ`
      });
      return;
    }

    // 🔒 BLOQUEAR
    state.activeDownloads.push(sender);
    await saveState();

    let filePath = null;

    try {
      const query = args.join(' ');

      const apisPath = path.join(__dirname, '../api/apis.json');
      const apis = JSON.parse(await fsp.readFile(apisPath, 'utf8'));

      if (!apis.youtube) {
        throw new Error('No se configuró la API de YouTube.');
      }

      const searchUrl =
        `https://www.googleapis.com/youtube/v3/search` +
        `?part=snippet&type=video&maxResults=1` +
        `&q=${encodeURIComponent(query)}` +
        `&key=${apis.youtube}`;

      const { data } = await axios.get(searchUrl);

      if (!data.items?.length) {
        throw new Error('No se encontraron videos.');
      }

      const videoId = data.items[0].id.videoId;

      const statsUrl =
        `https://www.googleapis.com/youtube/v3/videos` +
        `?part=snippet&id=${videoId}` +
        `&key=${apis.youtube}`;

      const stats = await axios.get(statsUrl);
      const video = stats.data.items[0];

      const title = video.snippet.title.replace(/[<>:"/\\|?*]/g, '');
      const channel = video.snippet.channelTitle;
      const url = `https://www.youtube.com/watch?v=${videoId}`;

      await sock.sendMessage(jid, {
        text:
`* 🎬 ᴠɪᴅᴇᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ *

> 🎥 *${title}*
> 👤 ${channel}
> 🔗 ${url}

⏳ ᴅᴇsᴄᴀʀɢᴀɴᴅᴏ ᴠɪᴅᴇᴏ...`
      });

      const scriptPath = path.join(
        __dirname,
        '../../src/python/download-video.py'
      );

      const downloadsDir = path.join(
        __dirname,
        '../../data/downloads/video'
      );

      await fsp.mkdir(downloadsDir, { recursive: true });

      const { stdout, stderr } = await execFilePromise(
        'python3',
        [scriptPath, url, downloadsDir],
        { timeout: 1000 * 60 * 15 }
      );

      if (stderr && /403|challenge|signature/i.test(stderr)) {
        throw new Error('YouTube bloqueó la descarga.');
      }

      filePath = stdout
        .split('\n')
        .map(l => l.trim())
        .find(l => l.endsWith('.mp4'));

      if (!filePath || !fs.existsSync(filePath)) {
        throw new Error('No se pudo generar el video.');
      }

      await sock.sendMessage(jid, {
        video: { url: filePath },
        caption:
`* 🎬 ${title} *
> 👤 ${channel}`
      });

    } catch (err) {
      console.error('[YT4 ERROR]', err);

      await sock.sendMessage(jid, {
        text:
`* ❌ ᴇʀʀᴏʀ ᴇɴ ʟᴀ ᴅᴇsᴄᴀʀɢᴀ *

> ${err.message}`
      });

    } finally {
      if (filePath) {
        setTimeout(() => {
          fsp.unlink(filePath).catch(() => {});
        }, 5000);
      }

      state.activeDownloads = state.activeDownloads.filter(
        u => u !== sender
      );

      await saveState();
    }
  }
};