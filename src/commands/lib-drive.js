const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const cooldowns = new Map();
const lastSent = {};

module.exports = {
  name: 'drive',
  alias: ['gdrive', 'googledrive'],
  description: 'ᴅᴇsᴄᴀʀɢᴀ ᴀʀᴄʜɪᴠᴏs ᴅᴇsᴅᴇ ᴇɴʟᴀᴄᴇs ᴘᴜ́ʙʟɪᴄᴏs ᴅᴇ ɢᴏᴏɢʟᴇ ᴅʀɪᴠᴇ.',
  noCooldown: true,


  exec: async ({ sock, message, args, state }) => {
    const jid = message.key.remoteJid;

    // 🕒 ᴄᴏᴏʟᴅᴏᴡɴ
    const now = Date.now();
    if (cooldowns.has(jid) && now - cooldowns.get(jid) < 2000) {
      await sock.sendMessage(jid, { react: { text: '⏳', key: message.key } });
      return;
    }
    cooldowns.set(jid, now);

    if (!args[0]) {
      await sock.sendMessage(
        jid,
        {
          text: `⚠️ ᴜsᴏ ᴄᴏʀʀᴇᴄᴛᴏ:
> .drive <ᴜʀʟ>`
        },
        { quoted: message }
      );
      return;
    }

    const inputUrl = args[0].trim();

    const match = inputUrl.match(
      /(?:https?:\/\/)?(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=))([\w-]{20,})/
    );

    if (!match || !match[1]) {
      await sock.sendMessage(
        jid,
        { text: '❌ ᴇɴʟᴀᴄᴇ ᴅᴇ ɢᴏᴏɢʟᴇ ᴅʀɪᴠᴇ ɴᴏ ᴠᴀ́ʟɪᴅᴏ.' },
        { quoted: message }
      );
      return;
    }

    const fileId = match[1];
    const downloadsDir = state.config?.DOWNLOADS_DIR || '../../data/downloads';
    let tempPath = '';

    if (lastSent[jid] === fileId) return;
    lastSent[jid] = fileId;
    setTimeout(() => delete lastSent[jid], 10 * 60 * 1000);

    try {
      await sock.sendMessage(jid, { react: { text: '📥', key: message.key } });

      const baseUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

      const head = await axios.get(baseUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        maxRedirects: 0,
        validateStatus: null
      }).catch(() => null);

      if (!head || head.status >= 400) {
        await sock.sendMessage(jid, {
          text: `🚫 ɴᴏ sᴇ ᴘᴜᴇᴅᴇ ᴀᴄᴄᴇᴅᴇʀ ᴀʟ ᴀʀᴄʜɪᴠᴏ.
ᴠᴇʀɪғɪᴄᴀ ǫᴜᴇ sᴇᴀ ᴘᴜ́ʙʟɪᴄᴏ.`
        });
        return;
      }

      let downloadUrl = baseUrl;
      if (head.headers['set-cookie']) {
        const confirmMatch = (head.data || '').match(/confirm=([0-9A-Za-z_]+)/);
        if (confirmMatch) {
          downloadUrl = `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${fileId}`;
        }
      }

      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        maxRedirects: 5,
        timeout: 30000
      });

      let fileName = `archivo_${fileId}.bin`;
      const cd = response.headers['content-disposition'];
      if (cd) {
        const m = cd.match(/filename="?(.*?)"?$/);
        if (m) fileName = decodeURIComponent(m[1]);
      }

      const sizeMB = (response.data.length / (1024 * 1024)).toFixed(2);
      if (sizeMB > 300) {
        await sock.sendMessage(jid, {
          text: `⚠️ ᴇʟ ᴀʀᴄʜɪᴠᴏ (${sizeMB} ᴍʙ)
sᴜᴘᴇʀᴀ ᴇʟ ʟɪ́ᴍɪᴛᴇ ᴘᴇʀᴍɪᴛɪᴅᴏ (300 ᴍʙ).`
        });
        return;
      }

      await fs.mkdir(downloadsDir, { recursive: true });
      tempPath = path.join(downloadsDir, fileName);
      await fs.writeFile(tempPath, response.data);

      await sock.sendMessage(
        jid,
        {
          document: response.data,
          fileName,
          mimetype: 'application/octet-stream',
          caption: `> ᴅᴇsᴄᴀʀɢᴀ ᴄᴏᴍᴘʟᴇᴛᴀ

* *📄 ɴᴏᴍʙʀᴇ*
> ${fileName}

* *💾 ᴛᴀᴍᴀñᴏ*
> ${sizeMB} ᴍʙ`
        },
        { quoted: message }
      );

      await sock.sendMessage(jid, { react: { text: '✅', key: message.key } });

    } catch (err) {
      console.error('[DRIVE ERROR]', err);

      let msg = '❌ ᴇʀʀᴏʀ ᴀʟ ᴅᴇsᴄᴀʀɢᴀʀ.';
      if (err.message?.includes('redirects')) msg = '🚫 ᴅᴇᴍᴀsɪᴀᴅᴀs ʀᴇᴅɪʀᴇᴄᴄɪᴏɴᴇs.';
      else if (err.code === 'ECONNABORTED') msg = '⏱️ ᴛɪᴇᴍᴘᴏ ᴅᴇ ᴇsᴘᴇʀᴀ ᴀɢᴏᴛᴀᴅᴏ.';
      else if (err.response?.status === 404) msg = '❌ ᴀʀᴄʜɪᴠᴏ ɴᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ.';
      else if (err.response?.status === 403) msg = '🚫 ᴀᴄᴄᴇsᴏ ᴅᴇɴᴇɢᴀᴅᴏ.';

      await sock.sendMessage(jid, { text: msg }, { quoted: message });
      await sock.sendMessage(jid, { react: { text: '❌', key: message.key } });

    } finally {
      if (tempPath) {
        try { await fs.unlink(tempPath); } catch {}
      }
    }
  }
};
