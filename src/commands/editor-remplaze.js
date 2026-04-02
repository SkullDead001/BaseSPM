const fs = require("fs");
const path = require("path");

const sessionFile = path.join(process.cwd(), "data", "replace-session.json");

// 📂 Archivos permitidos (según tu estructura real)
const allowedFiles = [
  path.join(process.cwd(), "src/commands/cmd-noty.js"),
  path.join(process.cwd(), "src/commands/lib-menu.js"),
  path.join(process.cwd(), "src/commands/lib-qc.js"),
  path.join(process.cwd(), "src/commands/lib-sticker.js"),
  path.join(process.cwd(), "utils/eventos.js")
];

module.exports = {
  name: "replace",
  alias: ["buscarreemplazar"],
  description: "Busqueda y reemplazo controlado del sistema.",
  noCooldown: true,

  exec: async ({ sock, message, args }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith("@g.us")) return;

      const sender = message.key.participant || jid;

      // 👑 Verificar admin
      const meta = await sock.groupMetadata(jid);
      const participante = meta.participants.find(p => p.id === sender);

      if (!participante || !participante.admin) {
        await sock.sendMessage(jid, {
          text: "* 🚫 sᴏʟᴏ ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴘᴜᴇᴅᴇɴ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ.*"
        });
        return;
      }

      // ♻️ Reset sesión
      if (args[0] === "reset") {
        if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);

        await sock.sendMessage(jid, {
          text: "* ♻️ sᴇsɪᴏ́ɴ ʀᴇɪɴɪᴄɪᴀᴅᴀ.*"
        });
        return;
      }

      // 🔎 Si ya existe sesión activa
      if (fs.existsSync(sessionFile)) {
        const session = JSON.parse(fs.readFileSync(sessionFile));

        await sock.sendMessage(jid, {
          text:
`* ⚠️ sᴇsɪᴏ́ɴ ᴀᴄᴛɪᴠᴀ *

> ᴛᴇxᴛᴏ ʙᴜsᴄᴀᴅᴏ:
* ${session.textoBuscar} *

✏️ ᴇsᴄʀɪʙᴇ ᴇʟ ɴᴜᴇᴠᴏ ᴛᴇxᴛᴏ
❌ ᴏ ᴇsᴄʀɪʙᴇ *ᴄᴀɴᴄᴇʟᴀʀ*`
        });

        const nuevoTexto = await esperarRespuesta(sock, jid, sender);

        if (!nuevoTexto || nuevoTexto.toLowerCase() === "cancelar") {
          await sock.sendMessage(jid, {
            text: "* ❌ ᴏᴘᴇʀᴀᴄɪᴏ́ɴ ᴄᴀɴᴄᴇʟᴀᴅᴀ.*"
          });
          return;
        }

        let archivosModificados = 0;
        let totalReemplazos = 0;

        allowedFiles.forEach(filePath => {
          if (!fs.existsSync(filePath)) return;

          let contenido = fs.readFileSync(filePath, "utf8");

          if (!contenido.includes(session.textoBuscar)) return;

          const coincidencias =
            contenido.split(session.textoBuscar).length - 1;

          contenido = contenido.split(session.textoBuscar).join(nuevoTexto);
          fs.writeFileSync(filePath, contenido);

          archivosModificados++;
          totalReemplazos += coincidencias;
        });

        fs.unlinkSync(sessionFile);

        await sock.sendMessage(jid, {
          text:
`* ✅ ʀᴇᴇᴍᴘʟᴀᴢᴏ ᴄᴏᴍᴘʟᴇᴛᴀᴅᴏ *

> ᴀʀᴄʜɪᴠᴏs ᴍᴏᴅɪғɪᴄᴀᴅᴏs:
* ${archivosModificados} *

> ʀᴇᴇᴍᴘʟᴀᴢᴏs ʀᴇᴀʟɪᴢᴀᴅᴏs:
* ${totalReemplazos} *

♻️ ʀᴇɪɴɪᴄɪᴀɴᴅᴏ...`
        });

        setTimeout(() => process.exit(0), 2000);
        return;
      }

      // 🔍 Nueva búsqueda
      if (!args.length) {
        await sock.sendMessage(jid, {
          text: "* ⚠️ ᴜsᴀ: *.replace {texto a buscar}*"
        });
        return;
      }

      const textoBuscar = args.join(" ");
      let totalCoincidencias = 0;
      let archivosEncontrados = 0;

      allowedFiles.forEach(filePath => {
        if (!fs.existsSync(filePath)) return;

        const contenido = fs.readFileSync(filePath, "utf8");

        if (contenido.includes(textoBuscar)) {
          const coincidencias =
            contenido.split(textoBuscar).length - 1;

          archivosEncontrados++;
          totalCoincidencias += coincidencias;
        }
      });

      if (!archivosEncontrados) {
        await sock.sendMessage(jid, {
          text: "* ❌ ɴᴏ sᴇ ᴇɴᴄᴏɴᴛʀᴀʀᴏɴ ᴄᴏɪɴᴄɪᴅᴇɴᴄɪᴀs.*"
        });
        return;
      }

      fs.writeFileSync(sessionFile, JSON.stringify({
        textoBuscar
      }, null, 2));

      await sock.sendMessage(jid, {
        text:
`* 🔎 ʙᴜ́sǫᴜᴇᴅᴀ ᴄᴏᴍᴘʟᴇᴛᴀᴅᴀ *

> ᴀʀᴄʜɪᴠᴏs ᴀғᴇᴄᴛᴀᴅᴏs:
* ${archivosEncontrados} *

> ᴄᴏɪɴᴄɪᴅᴇɴᴄɪᴀs:
* ${totalCoincidencias} *

✏️ ᴇsᴄʀɪʙᴇ ᴇʟ ɴᴜᴇᴠᴏ ᴛᴇxᴛᴏ
❌ ᴏ ᴇsᴄʀɪʙᴇ *ᴄᴀɴᴄᴇʟᴀʀ*`
      });

    } catch (err) {
      console.error("[REPLACE ERROR]", err);
      await sock.sendMessage(message.key.remoteJid, {
        text: "* ❌ ᴇʀʀᴏʀ ᴅᴜʀᴀɴᴛᴇ ᴇʟ ᴘʀᴏᴄᴇsᴏ.*"
      });
    }
  }
};

async function esperarRespuesta(sock, jid, sender, timeout = 60000) {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      sock.ev.off("messages.upsert", handler);
      resolve(null);
    }, timeout);

    const handler = (msgUpsert) => {
      const msg = msgUpsert.messages?.[0];
      if (!msg?.message) return;

      const from = msg.key.participant || msg.key.remoteJid;

      if (from === sender && msg.key.remoteJid === jid) {
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text;

        if (text) {
          clearTimeout(timer);
          sock.ev.off("messages.upsert", handler);
          resolve(text.trim());
        }
      }
    };

    sock.ev.on("messages.upsert", handler);
  });
}