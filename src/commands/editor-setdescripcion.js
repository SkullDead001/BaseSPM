// ===========================================================
// 📝 Cᴏᴍᴀɴᴅᴏ: .dsc
// Pᴇʀᴍɪᴛᴇ ᴄᴀᴍʙɪᴀʀ ʟᴀ ᴅᴇꜱᴄʀɪᴘᴄɪᴏ́ɴ ᴅᴇʟ ɢʀᴜᴘᴏ (ꜱᴏʟᴏ ᴀᴅᴍɪɴꜱ)
// ===========================================================

const fs = require("fs");
const path = require("path");
const images = require("../../utils/images.js");

module.exports = {
  name: "dsc",
  alias: ["descripcion", "desc"],
  description: "Mᴏᴅɪꜰɪᴄᴀ ʟᴀ ᴅᴇꜱᴄʀɪᴘᴄɪᴏ́ɴ ᴅᴇʟ ɢʀᴜᴘᴏ (ꜱᴏʟᴏ ᴀᴅᴍɪɴꜱ)",
  noCooldown: true,

  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;
      if (!jid.endsWith("@g.us")) return;

      // 👑 Vᴇʀɪꜰɪᴄᴀʀ ᴘᴇʀᴍɪꜱᴏꜱ
      const groupMeta = await sock.groupMetadata(jid);
      const admins = groupMeta.participants
        .filter((p) => p.admin === "admin" || p.admin === "superadmin")
        .map((p) => p.id);

      if (!admins.includes(sender)) {
        await sock.sendMessage(jid, { react: { text: "🚫", key: message.key } });
        return;
      }

      // 📜 Oʙᴛᴇɴᴇʀ ᴇʟ ᴛᴇxᴛᴏ
      const text =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text;
      if (!text) return;

      // 📋 Cᴏɴᴛᴇɴɪᴅᴏ ᴅᴇꜱᴘᴜᴇ́ꜱ ᴅᴇʟ ᴄᴏᴍᴀɴᴅᴏ
      const contenido = text.slice(text.indexOf(" ") + 1).trim();
      if (!contenido) {
        await sock.sendMessage(jid, {
          text: "⚠️ Dᴇʙᴇꜱ ᴇꜱᴄʀɪʙɪʀ ʟᴀ ɴᴜᴇᴠᴀ ᴅᴇꜱᴄʀɪᴘᴄɪᴏ́ɴ ᴅᴇʟ ɢʀᴜᴘᴏ.",
        });
        return;
      }

      // 💾 Gᴜᴀʀᴅᴀʀ ᴇɴ ᴀʀᴄʜɪᴠᴏ
      const dir = path.join(__dirname, "../../data/groupdesc", jid);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, "descripcion.txt");
      fs.writeFileSync(filePath, contenido, "utf8");

      // 🛠️ Aᴄᴛᴜᴀʟɪᴢᴀʀ ʟᴀ ᴅᴇꜱᴄʀɪᴘᴄɪᴏ́ɴ ᴇɴ ᴇʟ ɢʀᴜᴘᴏ
      await sock.groupUpdateDescription(jid, contenido);

      // 🌆 Iᴍᴀɢᴇɴ ᴅᴇ ᴄᴏɴꜰɪʀᴍᴀᴄɪᴏ́ɴ
      const img = images.descripcion || images.menu || null;

      const caption = `─❰ 📝 Dᴇꜱᴄʀɪᴘᴄɪᴏ́ɴ Aᴄᴛᴜᴀʟɪᴢᴀᴅᴀ ❱

 👑 Aᴅᴍɪɴ: 
 > @${sender.split("@")[0]}

 🕓 Fᴇᴄʜᴀ: 
 > ${new Date().toLocaleString("es-MX")}

* 🖋️ Nᴜᴇᴠᴀ Dᴇꜱᴄʀɪᴘᴄɪᴏ́ɴ

${contenido}

✅ Cᴀᴍʙɪᴏ ɢᴜᴀʀᴅᴀᴅᴏ ᴄᴏɴ ᴇ́xɪᴛᴏ`;

      if (img && fs.existsSync(img)) {
        await sock.sendMessage(jid, {
          image: { url: img },
          caption,
          mentions: [sender],
        });
      } else {
        await sock.sendMessage(jid, { text: caption, mentions: [sender] });
      }
    } catch (err) {
      console.error("[DSC ERROR]", err);
      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Oᴄᴜʀʀɪᴏ́ ᴜɴ ᴇʀʀᴏʀ ᴀʟ ᴀᴄᴛᴜᴀʟɪᴢᴀʀ ʟᴀ ᴅᴇꜱᴄʀɪᴘᴄɪᴏ́ɴ.",
      });
    }
  },
};
