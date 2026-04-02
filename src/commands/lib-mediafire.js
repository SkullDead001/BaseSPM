const fetch = require('node-fetch');
const cooldowns = new Map();

module.exports = {
  name: 'mediafire',
  alias: ['mf', 'dlmediafire'],
  description: 'ᴅᴇsᴄᴀʀɢᴀ ᴀʀᴄʜɪᴠᴏs ᴅᴇsᴅᴇ ᴍᴇᴅɪᴀғɪʀᴇ ʏ ʟᴏs ᴇɴᴠɪ́ᴀ ᴀʟ ᴄʜᴀᴛ.',
  noCooldown: true,


  async exec({ sock, message, args }) {
    const jid = message.key.remoteJid;

    // 🕒 ᴄᴏᴏʟᴅᴏᴡɴ ɢʟᴏʙᴀʟ
    const now = Date.now();
    if (cooldowns.has(jid) && now - cooldowns.get(jid) < 2000) {
      await sock.sendMessage(jid, { react: { text: '⏳', key: message.key } });
      return;
    }
    cooldowns.set(jid, now);

    // ⚙️ ᴠᴀʟɪᴅᴀʀ ᴀʀɢᴜᴍᴇɴᴛᴏ
    if (!args.length) {
      await sock.sendMessage(
        jid,
        {
          text: `* *⚠️ ᴜsᴏ ᴄᴏʀʀᴇᴄᴛᴏ*
> .mediafire <ᴜʀʟ>

* *ᴇᴊᴇᴍᴘʟᴏ:*
> .mediafire https://www.mediafire.com/file/ejemplo/file.zip`
        },
        { quoted: message }
      );
      return;
    }

    const url = args[0].trim();

    // 🔍 ᴠᴀʟɪᴅᴀʀ ᴜʀʟ
    if (!/^https?:\/\/(www\.)?mediafire\.com\/file\//i.test(url)) {
      await sock.sendMessage(
        jid,
        {
          text: `* *❌ ᴇɴʟᴀᴄᴇ ɴᴏ ᴠᴀ́ʟɪᴅᴏ*

* *ᴇᴊᴇᴍᴘʟᴏ*
> .mediafire https://www.mediafire.com/file/ejemplo/file.zip`
        },
        { quoted: message }
      );
      return;
    }

    await sock.sendMessage(jid, { react: { text: '📥', key: message.key } });

    try {
      // 🌐 ᴀᴘɪs
      const apis = [
        `https://delirius-apiofc.vercel.app/download/mediafire?url=${encodeURIComponent(url)}`,
        `https://vihangayt.me/download/mediafire?url=${encodeURIComponent(url)}`,
        `https://api.maher-zubair.tech/mediafire?url=${encodeURIComponent(url)}`
      ];

      let data = null;
      let success = false;

      for (const api of apis) {
        try {
          const res = await fetch(api);
          if (!res.ok) continue;
          const json = await res.json();
          data = json?.data || json?.result || json;
          if (data?.url || data?.download || data?.link) {
            success = true;
            break;
          }
        } catch {}
      }

      if (!success || !data) {
        throw new Error('ᴏʙᴛᴇɴᴄɪᴏ́ɴ ғᴀʟʟɪᴅᴀ');
      }

      const fileUrl = data.url || data.download || data.link;
      const fileTitle = data.filename || data.title || data.name || 'archivo';
      const fileSize = (data.size || data.filesize || '0').toString().replace('MB', '').trim();
      const fileMime = data.mime || data.mimetype || 'application/octet-stream';

      // 📏 ʟɪ́ᴍɪᴛᴇ
      const maxSize = 250;
      const sizeMB = parseFloat(fileSize);

      if (!isNaN(sizeMB) && sizeMB > maxSize) {
        await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
        await sock.sendMessage(
          jid,
          {
            text: `⚠️ ᴇʟ ᴀʀᴄʜɪᴠᴏ (${sizeMB} ᴍʙ)
sᴜᴘᴇʀᴀ ᴇʟ ʟɪ́ᴍɪᴛᴇ ᴅᴇ ${maxSize} ᴍʙ`
          },
          { quoted: message }
        );
        return;
      }

      const caption = `> ᴅᴇsᴄᴀʀɢᴀ ᴄᴏᴍᴘʟᴇᴛᴀ

* *📄 ɴᴏᴍʙʀᴇ*
> ${fileTitle}

* *💾 ᴛᴀᴍᴀñᴏ*
> ${fileSize} ᴍʙ`;

      await sock.sendMessage(
        jid,
        {
          document: { url: fileUrl },
          mimetype: fileMime,
          fileName: fileTitle,
          caption
        },
        { quoted: message }
      );

      await sock.sendMessage(jid, { react: { text: '✅', key: message.key } });

    } catch (error) {
      console.error('[MEDIAFIRE ERROR]', error);

      let msg = '❌ ɴᴏ sᴇ ᴘᴜᴅᴏ ᴅᴇsᴄᴀʀɢᴀʀ ᴇʟ ᴀʀᴄʜɪᴠᴏ';

      if (error.message.includes('fetch') || error.code === 'ENOTFOUND') {
        msg = '🌐 ɴᴏ sᴇ ᴘᴜᴅᴏ ᴄᴏɴᴇᴄᴛᴀʀ ᴄᴏɴ ʟᴀs ᴀᴘɪs';
      } else if (error.message.includes('ᴏʙᴛᴇɴᴄɪᴏ́ɴ')) {
        msg = '⚠️ ɴᴏ sᴇ ᴘᴜᴅᴏ ᴏʙᴛᴇɴᴇʀ ʟᴀ ɪɴғᴏʀᴍᴀᴄɪᴏ́ɴ ᴅᴇʟ ᴀʀᴄʜɪᴠᴏ';
      }

      await sock.sendMessage(jid, { react: { text: '❌', key: message.key } });
      await sock.sendMessage(jid, { text: msg }, { quoted: message });
    }
  }
};
