// ===========================================================
// 🔗 Cᴏᴍᴀɴᴅᴏ: .antilink
// ===========================================================

const fs = require("fs");
const path = require("path");
const images = require("../../utils/images");
const esAdmin = require("../../utils/admin");

module.exports = {
  name: "antilink",
  alias: ["antilinks", "antilk"],
  desc: "Aᴄᴛɪᴠᴀ ᴏ ᴅᴇꜱᴀᴄᴛɪᴠᴀ ᴇʟ ꜱɪꜱᴛᴇᴍᴀ ᴀɴᴛɪʟɪɴᴋ ᴅᴇʟ ɢʀᴜᴘᴏ.",
  noCooldown: true,

  exec: async ({ sock, message, args }) => {
    const jid = message.key.remoteJid;
    const sender = message.key.participant || jid;

    try {
      if (!jid.endsWith("@g.us")) return;

      // 👑 admin
      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, { react: { text: "🚫", key: message.key } });
        return;
      }

      // 📂 config
      const dir = path.join(__dirname, "../../data/antilink");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `${jid}.json`);

      let data = fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath))
        : { enabled: false, kick: false };

      // 🔴 OFF
      if (args[0] === "off") {
        data.enabled = false;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        const caption = `> 🔗Aɴᴛɪʟɪɴᴋ Sᴛᴀᴛᴜs 

* *👑 Aᴄᴄɪᴏɴ ᴘᴏʀ 👑*
> @${sender.split("@")[0]}

* *Esᴛᴀᴅᴏ ᴀᴄᴛᴜᴀʟ*
> 🔴 Dᴇꜱᴀᴄᴛɪᴠᴀᴅᴏ`;

        await sock.sendMessage(jid, { text: caption, mentions: [sender] });
        return;
      }

      // 🟢 ON
      if (args[0] === "on") {
        data.enabled = true;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        await sock.sendMessage(jid, {
          text: `> 🔗Aɴᴛɪʟɪɴᴋ Sᴛᴀᴛᴜs 

* *👑 Aᴄᴄɪᴏɴ ᴘᴏʀ 👑*
> @${sender.split("@")[0]}

* *Cᴏɴꜰɪɢᴜʀᴀᴄɪᴏ́ɴ*
> ¿Dᴇꜱᴇᴀꜱ Qᴜᴇ Eʟ Bᴏᴛ *Eᴘᴜʟꜱᴇ* Aʟ Uꜱᴜᴀʀɪᴏ Cᴜᴀɴᴅᴏ Eɴᴠɪ́ᴇ Lɪɴᴋꜱ?

> Rᴇꜱᴘᴏɴᴅᴇ: *sɪ* / *ɴᴏ*`,
          mentions: [sender],
        });

        // ⏳ esperar respuesta SOLO del admin
        const respuesta = await esperarRespuesta(sock, jid, sender);
        if (!respuesta) return;

        if (respuesta === "si" || respuesta === "sí") {
          data.kick = true;
        } else if (respuesta === "no") {
          data.kick = false;
        } else return;

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        const caption = `> 🔗Aɴᴛɪʟɪɴᴋ Sᴛᴀᴛᴜs 

* *👑 Aᴄᴄɪᴏɴ ᴘᴏʀ 👑*
> @${sender.split("@")[0]}

* *Esᴛᴀᴅᴏ ᴀᴄᴛᴜᴀʟ*
> 🟢 Aᴄᴛɪᴠᴀᴅᴏ

* *Eꜱᴛɪʟᴏ Dᴇ Aᴄᴄɪᴏ́ɴ*
> ${data.kick ? "🚪 Eʟɪᴍɪɴᴀʀ ʏ Eᴘᴜʟꜱᴀʀ" : "🗑️ Sᴏʟᴏ Eʟɪᴍɪɴᴀʀ"}`;

        const imgPath = images.antilink || images.admin || images.menu;
        if (imgPath && fs.existsSync(imgPath)) {
          await sock.sendMessage(jid, {
            image: { url: imgPath },
            caption,
            mentions: [sender],
          });
        } else {
          await sock.sendMessage(jid, { text: caption, mentions: [sender] });
        }
      }
    } catch (err) {
      console.error("[ANTILINK CMD ERROR]", err);
      await sock.sendMessage(jid, {
        text: "❌ Eʀʀᴏʀ ᴀʟ ᴇᴊᴇᴄᴜᴛᴀʀ ᴇʟ ᴄᴏᴍᴀɴᴅᴏ *antilink*.",
      });
    }
  },
};

/* ===================================================
   🕒 Esperar respuesta (MISMO ADMIN)
=================================================== */
async function esperarRespuesta(sock, jid, sender, timeout = 60000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      sock.ev.off("messages.upsert", handler);
      resolve("");
    }, timeout);

    const handler = (msgUpsert) => {
      const msg = msgUpsert.messages?.[0];
      if (!msg?.message) return;

      const from = msg.key.participant || msg.key.remoteJid;
      if (from === sender && msg.key.remoteJid === jid) {
        clearTimeout(timer);
        sock.ev.off("messages.upsert", handler);

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          "";

        resolve(text.trim().toLowerCase());
      }
    };

    sock.ev.on("messages.upsert", handler);
  });
}
