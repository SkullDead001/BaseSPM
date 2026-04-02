const fs = require("fs");
const path = require("path");
const esAdmin = require("../../utils/admin");

const procesos = new Map();
const baseDir = path.join(__dirname, "../../data/modonoche");

if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

module.exports = {
  name: "modonoche",
  alias: ["mn", "nightmode"],
  description: "Configura el modo noche del grupo",
  noCooldown: true,

  exec: async ({ sock, message, args }) => {
    const jid = message.key.remoteJid;
    if (!jid.endsWith("@g.us")) return;

    const admin = await esAdmin(sock, jid, message);
    if (!admin && !message.key.fromMe) {
      await sock.sendMessage(jid, {
        text: `* 🚫 sᴏʟᴏ ʟᴏs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴘᴜᴇᴅᴇɴ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ.*`
      });
      return;
    }

    const configPath = path.join(baseDir, `${jid}.json`);
    let config = { activo: false, inicio: "" };

    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      } catch {}
    }

    const rawArg = args.join(" ").trim().toUpperCase();

    // 🟢 ACTIVAR
    if (["ON", "ENCENDER", "ACTIVAR"].includes(rawArg)) {
      if (!config.inicio) {
        await sock.sendMessage(jid, {
          text:
`* ⚠️ ᴘʀɪᴍᴇʀᴏ ᴄᴏɴғɪɢᴜʀᴀ ᴜɴᴀ ʜᴏʀᴀ *

> ᴇᴊᴇᴍᴘʟᴏ:
* *.modonoche 10:00 PM*`
        });
        return;
      }

      config.activo = true;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      iniciarModoNoche(sock, jid);

      await sock.sendMessage(jid, {
        text:
`* 🌙 ᴍᴏᴅᴏ ɴᴏᴄʜᴇ ᴀᴄᴛɪᴠᴀᴅᴏ *

> 🕓 ʜᴏʀᴀ:
* ${formatear12h(config.inicio)} *`
      });
      return;
    }

    // 🔴 DESACTIVAR
    if (["OFF", "APAGAR", "DESACTIVAR"].includes(rawArg)) {
      config.activo = false;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      detenerModoNoche(jid);

      await sock.sendMessage(jid, {
        text: `* ☀️ ᴍᴏᴅᴏ ɴᴏᴄʜᴇ ᴅᴇsᴀᴄᴛɪᴠᴀᴅᴏ *`
      });
      return;
    }

    // 🕓 CONFIGURAR HORA
    if (rawArg) {
      if (!/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(?: ?(AM|PM))?$/i.test(rawArg)) {
        await sock.sendMessage(jid, {
          text:
`* ⚠️ ғᴏʀᴍᴀᴛᴏ ɪɴᴠᴀ́ʟɪᴅᴏ *

> ᴇᴊᴇᴍᴘʟᴏ:
* *.modonoche 10:30 PM*
* *.modonoche 22:30*`
        });
        return;
      }

      const formato24 = convertirA24h(rawArg);
      config.inicio = formato24;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      if (config.activo) iniciarModoNoche(sock, jid);

      await sock.sendMessage(jid, {
        text:
`* ⏱️ ʜᴏʀᴀ ᴄᴏɴғɪɢᴜʀᴀᴅᴀ *

> 🕓 ${formatear12h(formato24)}

> ᴇsᴛᴀᴅᴏ:
${config.activo ? "🟢 ᴀᴄᴛɪᴠᴏ" : "🔴 ɪɴᴀᴄᴛɪᴠᴏ"}`
      });
      return;
    }

    // 📘 ESTADO
    await sock.sendMessage(jid, {
      text:
`* 🌙 ᴍᴏᴅᴏ ɴᴏᴄʜᴇ *

> 🕓 ʜᴏʀᴀ:
${config.inicio ? `* ${formatear12h(config.inicio)} *` : "ɴᴏ ᴄᴏɴғɪɢᴜʀᴀᴅᴀ"}

> ᴇsᴛᴀᴅᴏ:
${config.activo ? "🟢 ᴀᴄᴛɪᴠᴏ" : "🔴 ɪɴᴀᴄᴛɪᴠᴏ"}`
    });
  },
};