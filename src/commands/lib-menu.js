const fs = require("fs");
const images = require("../../utils/images");

const cooldowns = new Map();

module.exports = {
  name: "menu",
  alias: ["help"],
  description: "Muestra el menú principal con diseño moderno y organizado.",
  noCooldown: true,


  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;

      // 🕒 Anti-spam
      const now = Date.now();
      if (cooldowns.has(sender) && now - cooldowns.get(sender) < 5000) return;
      cooldowns.set(sender, now);

      const texto = `> 𝑩𝑰𝑬𝑵𝑽𝑬𝑵𝑰𝑫𝑶 𝑨𝑳 𝑴𝑬𝑵𝑼

👤 *Uꜱᴜᴀʀɪᴏ:*
> @${sender.split("@")[0]}

───────────
> BᴏʙMᴀʀʟᴇʏ☽ Bᴏᴛ
───────────
> *1. Aᴅᴍɪɴɪsᴛʀᴀᴄɪᴏ́ɴ*
> *2. Vᴇɴᴛᴀs/Sᴇʀᴠɪᴄɪᴏꜱ*

╭─┈ *Aᴅᴍɪɴɪꜱᴛʀᴀᴄɪᴏ́ɴ*
│
│ *_Gᴇsᴛɪᴏ́ɴ ᴅᴇ Gʀᴜᴘᴏ_*
│ • *.ɢʀᴜᴘᴏ* » Aʙʀɪʀ/Cᴇʀʀᴀʀ
│ • *.ɴᴏᴛʏ* » Mᴇɴᴄɪᴏɴᴀʀ ᴀ ᴛᴏᴅᴏꜱ
│ • *.ᴅꜱᴄ* » Cᴀᴍʙɪᴀʀ ᴅᴇꜱᴄʀɪᴘᴄɪᴏ́ɴ
│ • *.ᴍᴏᴅᴏɴᴏᴄʜᴇ* » Cɪᴇʀʀᴇ ᴀᴜᴛᴏ
│ • *.ᴄᴇʀʀᴀʀ 5s/5ᴍ* » Cᴇʀʀᴀʀ ɢʀᴜᴘᴏ
│ • *.ᴀʙʀɪʀ 5s/5ᴍ* » Aʙʀɪʀ ɢʀᴜᴘᴏ
│
│ *_Mɪᴇᴍʙʀᴏꜱ ʏ Rᴏʟᴇꜱ_*
│ • *.ᴘʀᴏᴍᴏᴛᴇ* » Dᴀʀ Aᴅᴍɪɴ
│ • *.ᴅᴇᴍᴏᴛᴇ* » Qᴜɪᴛᴀʀ Aᴅᴍɪɴ
│ • *.ᴋɪᴄᴋ* » Exᴘᴜʟꜱᴀʀ ᴍɪᴇᴍʙʀᴏ
│ • *.ꜰᴀɴᴛᴀꜱᴍᴀꜱ* » Lɪꜱᴛᴀʀ ɪɴᴀᴄᴛɪᴠᴏꜱ
│ • *.ᴋɪᴄᴋғᴀɴᴛᴀsᴍᴀꜱ* » Exᴘᴜʟᴄɪᴏɴ
│ • *.ᴍᴜᴛᴇ* » Bʟᴏǫᴜᴇᴀʀ ᴄʜᴀᴛ
│ • *.ᴜɴᴍᴜᴛᴇ* » Dᴇꜱʙʟᴏǫᴜᴇᴀʀ ᴄʜᴀᴛ
│
│ *_Sᴇɢᴜʀɪᴅᴀᴅ ʏ Rᴇɢɪsᴛʀᴏꜱ_*
│ • *.ᴀɴᴛɪʟɪɴᴋ* » Aᴄᴛ/Dᴇꜱᴀᴄᴛɪᴠᴀʀ
│ • *.ʀᴇꜱᴇᴛʟɪɴᴋ* » Rᴇꜱᴛᴀʙʟᴇᴄᴇʀ ʟɪɴᴋ
│ • *.ɴᴏᴘʀɪᴠᴀᴅᴏ* » Oғ/Oɴ Aɴᴛɪ-Pʀɪᴠ
│ • *.ᴀɴᴛɪᴘʀɪᴠ* » Mᴏᴅᴏ Aᴜᴛᴏᴍᴀ́ᴛɪᴄᴏ
│ • *.ʀᴀᴛᴀs* » Lɪꜱᴛᴀ ᴅᴇ ʀᴀᴛᴀꜱ
│ • *.ᴀɢɢ1* » Aɢʀᴇɢᴀʀ ʀᴀᴛᴀꜱ
│
│ *_Cᴏɴғɪɢᴜʀᴀᴄɪᴏ́ɴ_*
│ • *.ᴍꜱɢ ʙɪᴇɴᴠᴇɴɪᴅᴀ* » Eᴅɪᴛᴀʀ ᴛᴇxᴛᴏ
│ • *.ᴍꜱɢ ᴅᴇꜱᴘᴇᴅɪᴅᴀ* » Eᴅɪᴛᴀʀ ᴛᴇxᴛᴏ
│ • *.ᴍꜱɢ ʀᴇsᴇᴛ » ʙɪᴇɴᴠᴇɴɪᴅᴀ/ᴅᴇsᴘᴇᴅɪᴅᴀ*
│ • *.ɪᴍᴀɢᴇɴᴇs* » Iɴʜᴀʙɪʟɪᴛᴀ ɪᴍᴀɢᴇɴ
│ • *.ᴇᴍᴏᴊɪs* » Cᴀᴍʙɪᴀ ᴇᴍᴏᴊɪs
│ • *.sᴘᴀᴍ* » Aᴠɪꜱᴏꜱ
│ • *.ꜱᴏʀᴛᴇᴏ* » Eᴠᴇɴᴛᴏꜱ
│ • *.sᴇᴛɪᴍɢ » ᴄᴀᴍʙɪᴏ ᴅᴇ ɪᴍᴀɢᴇɴᴇs
│ • *.ʀᴇᴘʟᴀᴄᴇ » ᴄᴀᴍʙɪᴏ ᴅᴇ ɴᴏᴍʙʀᴇ
╰─┈

╭─┈ *Vᴇɴᴛᴀꜱ ʏ Sᴇʀᴠɪᴄɪᴏꜱ*
│
│ *_Rᴇɢɪꜱᴛʀᴏ ᴅᴇ Tʀᴀɴsᴀᴄᴄɪᴏɴᴇꜱ_:*
│ • *.ᴄᴏᴍᴘʀᴀ*
│ • *.ᴛᴏᴘs*
│ • *.ʟɪᴍᴘɪᴀʀᴄᴏᴍᴘʀᴀꜱ*
│ • *.ᴘᴀɢᴀᴅᴏ*
│ • *.ʀᴇɢɪꜱᴛʀᴏ*
│ • *.ʟɪᴍᴘɪᴀʀᴘᴀɢᴏꜱ*
│ • *.ꜱᴇᴛ*
╰─┈

> Usᴀ *.ᴍᴇɴᴜ2* ᴘᴀʀᴀ ᴠᴇʀ ᴍᴀs ᴄᴏᴍᴀɴᴅᴏs
`;

      if (fs.existsSync(images.menu)) {
        const buffer = fs.readFileSync(images.menu);
        await sock.sendMessage(jid, {
          image: buffer,
          caption: texto,
          mentions: [sender]
        });
        return;
      }

      await sock.sendMessage(jid, {
        text: texto,
        mentions: [sender]
      });

    } catch (err) {
      console.error("[MENU ERROR]", err);
      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Error al mostrar el menú."
      });
    }
  }
};
