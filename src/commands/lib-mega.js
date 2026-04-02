const fs = require('fs').promises;
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');
const mega = require('megajs');

const pipeline = promisify(stream.pipeline);
const cooldowns = new Map();
const lastSentMega = {};

module.exports = {
  name: 'mega',
  aliases: ['megadl'],
  description: 'ᴅᴇsᴄᴀʀɢᴀ ᴀʀᴄʜɪᴠᴏs ᴅᴇsᴅᴇ ᴍᴇɢᴀ.nz',
  noCooldown: true,


  exec: async ({ sock, message, args, state }) => {
    const jid = message.key.remoteJid;
    const sender = message.key.participant || jid;

    // 🕒 ᴄᴏᴏʟᴅᴏᴡɴ ɢʟᴏʙᴀʟ
    const now = Date.now();
    if (cooldowns.has(jid) && now - cooldowns.get(jid) < 2000) {
      await sock.sendMessage(jid, { react: { text: '⏳', key: message.key } });
      return;
    }
    cooldowns.set(jid, now);

    const link = args.join(' ').trim();

    // 🧩 ᴠᴀʟɪᴅᴀʀ ᴇɴʟᴀᴄᴇ
    if (!link || !/https?:\/\/mega\.nz\/file\/[A-Za-z0-9_-]+(#|!)[A-Za-z0-9_-]+/.test(link)) {
      await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
      await sock.sendMessage(
        jid,
        {
          text: `❌ ᴇɴʟᴀᴄᴇ ɴᴏ ᴠᴀ́ʟɪᴅᴏ

ᴇᴊᴇᴍᴘʟᴏ:
.mega https://mega.nz/file/XXXXX#YYYYY`
        },
        { quoted: message }
      );
      return;
    }

    // 🚫 ᴇᴠɪᴛᴀʀ ʀᴇᴘᴇᴛɪᴄɪᴏɴᴇs
    lastSentMega[jid] = lastSentMega[jid] || {};
    if (lastSentMega[jid].link === link) return;
    lastSentMega[jid].link = link;

    setTimeout(() => {
      if (lastSentMega[jid]?.link === link) delete lastSentMega[jid];
    }, 10 * 60 * 1000);

    let tempPath = '';

    try {
      await sock.sendMessage(jid, { react: { text: '📥', key: message.key } });

      // 📦 ᴄᴀʀɢᴀʀ ᴀʀᴄʜɪᴠᴏ
      const file = mega.File.fromURL(link);
      await file.loadAttributes();

      if (!file.name || !file.size) {
        throw new Error('ᴍᴇᴛᴀᴅᴀᴛᴏs ғᴀʟʟɪᴅᴏs');
      }

      const fileName = file.name;
      const fileSize = file.size;
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      const limitMB = 300;

      // ⚠️ ʟɪ́ᴍɪᴛᴇ ᴅᴇ ᴛᴀᴍᴀñᴏ
      if (fileSize > limitMB * 1024 * 1024) {
        await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
        await sock.sendMessage(
          jid,
          {
            text: `⚠️ ᴇʟ ᴀʀᴄʜɪᴠᴏ (${fileSizeMB} ᴍʙ)
sᴜᴘᴇʀᴀ ᴇʟ ʟɪ́ᴍɪᴛᴇ ᴅᴇ ${limitMB} ᴍʙ`
          },
          { quoted: message }
        );
        return;
      }

      // 📁 ᴅᴇsᴄᴀʀɢᴀʀ
      const downloadsDir = state.config?.DOWNLOADS_DIR || '../../data/downloads';
      await fs.mkdir(downloadsDir, { recursive: true });
      tempPath = path.join(downloadsDir, fileName);

      const { createWriteStream } = await import('fs');
      const writeStream = createWriteStream(tempPath);
      await pipeline(file.download(), writeStream);

      const fileBuffer = await fs.readFile(tempPath);

      // 📤 ᴇɴᴠɪᴀʀ
      await sock.sendMessage(
        jid,
        {
          document: fileBuffer,
          mimetype: 'application/octet-stream',
          fileName,
          caption: `> ᴅᴇsᴄᴀʀɢᴀ ᴄᴏᴍᴘʟᴇᴛᴀ

* *📄 ɴᴏᴍʙʀᴇ*
> ${fileName}

* *💾 ᴛᴀᴍᴀñᴏ*
${fileSizeMB} ᴍʙ`
        },
        { quoted: message }
      );

      await sock.sendMessage(jid, { react: { text: '✅', key: message.key } });

    } catch (error) {
      console.error('[MEGA ERROR]', error);

      let errorMsg = '❌ ᴇʀʀᴏʀ ᴀʟ ᴘʀᴏᴄᴇsᴀʀ ᴇʟ ᴇɴʟᴀᴄᴇ';

      if (error.message?.includes('Request failed')) {
        errorMsg = '🚫 ᴇɴʟᴀᴄᴇ ᴘʀɪᴠᴀᴅᴏ ᴏ ʀᴏᴛᴏ';
      } else if (error.message?.includes('ENOTFOUND')) {
        errorMsg = '🌐 ɴᴏ sᴇ ᴘᴜᴅᴏ ᴄᴏɴᴇᴄᴛᴀʀ ᴄᴏɴ ᴍᴇɢᴀ';
      } else if (error.message?.includes('decrypt')) {
        errorMsg = '🔑 ᴄʟᴀᴠᴇ ᴅᴇʟ ᴇɴʟᴀᴄᴇ ɪɴᴠᴀ́ʟɪᴅᴀ';
      }

      await sock.sendMessage(jid, { react: { text: '❌', key: message.key } });
      await sock.sendMessage(jid, { text: errorMsg }, { quoted: message });
    } finally {
      if (tempPath) {
        try { await fs.unlink(tempPath); } catch {}
      }
    }
  }
};
