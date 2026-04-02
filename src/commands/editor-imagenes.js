// ===========================================================
// 🎨 Comando: .imagenes
// ʟɪsᴛᴀ, ᴀᴄᴛɪᴠᴀ ᴏ ᴅᴇsᴀᴄᴛɪᴠᴀ ɪᴍᴀ́ɢᴇɴᴇs ʀᴇɴᴏᴍʙʀᴀɴᴅᴏ ᴀʀᴄʜɪᴠᴏs.
// ===========================================================

const fs = require("fs");
const path = require("path");

module.exports = {
  name: "imagenes",
  alias: ["imagen1", "imgs"],
  description: "ᴀᴄᴛɪᴠᴀ ᴏ ᴅᴇsᴀᴄᴛɪᴠᴀ ɪᴍᴀ́ɢᴇɴᴇs ᴅᴇʟ ʙᴏᴛ ʀᴇɴᴏᴍʙʀᴀɴᴅᴏ ᴀʀᴄʜɪᴠᴏs.",
  noCooldown: true,

  exec: async ({ sock, message, args }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith("@g.us")) return;

      const sender = message.key.participant || jid;
      const groupMeta = await sock.groupMetadata(jid);
      const admins = groupMeta.participants
        .filter(p => p.admin === "admin" || p.admin === "superadmin")
        .map(p => p.id);

      if (!admins.includes(sender)) {
        await sock.sendMessage(jid, {
          text: "🚫 sᴏʟᴏ ʟᴏs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴘᴜᴇᴅᴇɴ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ."
        });
        return;
      }

      // 📁 ᴄᴀʀᴘᴇᴛᴀ ᴍᴇᴅɪᴀ
      const dirMedia = path.join(__dirname, "..", "..", "media");
      if (!fs.existsSync(dirMedia)) {
        await sock.sendMessage(jid, {
          text: "❌ ɴᴏ ᴇxɪsᴛᴇ ʟᴀ ᴄᴀʀᴘᴇᴛᴀ ᴅᴇ ɪᴍᴀ́ɢᴇɴᴇs."
        });
        return;
      }

      const archivos = fs.readdirSync(dirMedia).filter(f => f.endsWith(".png"));
      if (!archivos.length) {
        await sock.sendMessage(jid, {
          text: "⚠️ ɴᴏ ʜᴀʏ ɪᴍᴀ́ɢᴇɴᴇs ᴅɪsᴘᴏɴɪʙʟᴇs."
        });
        return;
      }

      // 📋 sɪɴ ᴀʀɢᴜᴍᴇɴᴛᴏs → ʟɪsᴛᴀ
      if (args.length < 2) {
        let texto =
`> 🎨 ɢᴇsᴛᴏʀ ᴅᴇ ɪᴍᴀ́ɢᴇɴᴇs 
`;

        archivos.forEach((f, i) => {
          const off = f.startsWith("_off-");
          texto += `│ ${i + 1}. ${f.replace("_off-", "")} → ${off ? "❌ ᴅᴇsᴀᴄᴛɪᴠᴀᴅᴀ" : "📌 ᴀᴄᴛɪᴠᴀ"}\n`;
        });

        texto +=
`
* 💬 ᴜsᴀ:

*.ɪᴍᴀɢᴇɴᴇs*
> <ɴᴜ́ᴍᴇʀᴏ|ɴᴏᴍʙʀᴇ>
> <ᴀᴄᴛɪᴠᴀʀ|ᴅᴇsᴀᴄᴛɪᴠᴀʀ>`;

        await sock.sendMessage(jid, { text: texto });
        return;
      }

      // 🧩 ᴀʀɢᴜᴍᴇɴᴛᴏs
      const target = args[0].toLowerCase();
      const action = args[1].toLowerCase();

      if (!["activar", "desactivar"].includes(action)) {
        await sock.sendMessage(jid, {
          text: "⚠️ ᴜsᴀ: .ɪᴍᴀɢᴇɴᴇs <ɴᴜ́ᴍᴇʀᴏ|ɴᴏᴍʙʀᴇ> <ᴀᴄᴛɪᴠᴀʀ|ᴅᴇsᴀᴄᴛɪᴠᴀʀ>"
        });
        return;
      }

      // 🔍 ʙᴜ́sǫᴜᴇᴅᴀ
      let seleccionado = null;
      if (!isNaN(target)) {
        const index = parseInt(target) - 1;
        if (index >= 0 && index < archivos.length) {
          seleccionado = archivos[index];
        }
      } else {
        seleccionado = archivos.find(f =>
          f.toLowerCase().includes(target.replace(".png", "").toLowerCase())
        );
      }

      if (!seleccionado) {
        await sock.sendMessage(jid, {
          text: "❌ ɪᴍᴀɢᴇɴ ɴᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴀ."
        });
        return;
      }

      const rutaActual = path.join(dirMedia, seleccionado);
      const esOff = seleccionado.startsWith("_off-");

      // ⚙️ ᴅᴇsᴀᴄᴛɪᴠᴀʀ
      if (action === "desactivar" && !esOff) {
        const nuevo = `_off-${seleccionado}`;
        fs.renameSync(rutaActual, path.join(dirMedia, nuevo));
        await sock.sendMessage(jid, {
          text:
`> ❌ ${seleccionado}

ғᴜᴇ ᴅᴇsᴀᴄᴛɪᴠᴀᴅᴀ
ʏ ʀᴇɴᴏᴍʙʀᴀᴅᴀ ᴀ:

_off-${seleccionado}`
        });
        return;
      }

      // ⚙️ ᴀᴄᴛɪᴠᴀʀ
      if (action === "activar" && esOff) {
        const nuevo = seleccionado.replace(/^_off-/, "");
        fs.renameSync(rutaActual, path.join(dirMedia, nuevo));
        await sock.sendMessage(jid, {
          text:
`> 📌 ${nuevo}

ғᴜᴇ ʀᴇᴀᴄᴛɪᴠᴀᴅᴀ
ᴄᴏʀʀᴇᴄᴛᴀᴍᴇɴᴛᴇ.`
        });
        return;
      }

      // ℹ️ ᴇsᴛᴀᴅᴏ ɪɢᴜᴀʟ
      await sock.sendMessage(jid, {
        text: `⚠️ ʟᴀ ɪᴍᴀɢᴇɴ ʏᴀ ᴇsᴛᴀ́ ${esOff ? "ᴅᴇsᴀᴄᴛɪᴠᴀᴅᴀ" : "ᴀᴄᴛɪᴠᴀ"}.`
      });

    } catch (err) {
      console.error("[IMAGENES ERROR]", err);
      await sock.sendMessage(message.key.remoteJid, {
        text:
`❌ ᴇʀʀᴏʀ ᴀʟ ᴇᴊᴇᴄᴜᴛᴀʀ ᴇʟ ᴄᴏᴍᴀɴᴅᴏ.

> ɪɴᴛᴇ́ɴᴛᴀʟᴏ ɴᴜᴇᴠᴀᴍᴇɴᴛᴇ.`
      });
    }
  },
};
