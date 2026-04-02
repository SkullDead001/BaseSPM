const fs = require("fs");
const path = require("path");

const sessionFile = path.join(process.cwd(), "data", "replace-session.json");

module.exports = {
  name: "replace",
  alias: ["buscarreemplazar", "globalreplace"],
  description: "Busqueda y reemplazo global del sistema.",
  noCooldown: true,

  exec: async ({ sock, message, args }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith("@g.us")) return;

      const sender = message.key.participant || jid;

      // 👑 Verificar admin
      const groupMeta = await sock.groupMetadata(jid);
      const admins = groupMeta.participants
        .filter(p => p.admin === "admin" || p.admin === "superadmin")
        .map(p => p.id);

      if (!admins.includes(sender)) {
        await sock.sendMessage(jid, {
          text: `* 🚫 sᴏʟᴏ ʟᴏs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴘᴜᴇᴅᴇɴ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ.*`
        });
        return;
      }

      // 📂 Crear carpeta data si no existe
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // ♻️ Reset sesión
      if (args[0] === "reset") {
        if (fs.existsSync(sessionFile)) {
          fs.unlinkSync(sessionFile);
        }

        await sock.sendMessage(jid, {
          text: `* ♻️ sᴇsɪᴏ́ɴ ʀᴇɪɴɪᴄɪᴀᴅᴀ ᴄᴏʀʀᴇᴄᴛᴀᴍᴇɴᴛᴇ.*`
        });
        return;
      }

      // 🔎 Si ya existe sesión activa
      if (fs.existsSync(sessionFile)) {
        const session = JSON.parse(fs.readFileSync(sessionFile));

        await sock.sendMessage(jid, {
          text:
`* ⚠️ ʏᴀ ᴇxɪsᴛᴇ ᴜɴᴀ sᴇsɪᴏ́ɴ ᴀᴄᴛɪᴠᴀ*

> ᴛᴇxᴛᴏ ʙᴜsᴄᴀᴅᴏ:
* ${session.textoBuscar} *

> ᴀʀᴄʜɪᴠᴏs ᴀғᴇᴄᴛᴀᴅᴏs:
* ${session.archivos.length} *

✏️ ᴇsᴄʀɪʙᴇ ᴇʟ ɴᴜᴇᴠᴏ ᴛᴇxᴛᴏ
❌ ᴏ ᴇsᴄʀɪʙᴇ *ᴄᴀɴᴄᴇʟᴀʀ*`
        });

        const respuesta = await esperarRespuesta(sock, jid, sender);

        if (!respuesta || respuesta.toLowerCase() === "cancelar") {
          await sock.sendMessage(jid, {
            text: `* ❌ ᴏᴘᴇʀᴀᴄɪᴏ́ɴ ᴄᴀɴᴄᴇʟᴀᴅᴀ.*`
          });
          return;
        }

        const textoNuevo = respuesta;
        let totalReemplazos = 0;

        session.archivos.forEach(file => {
          if (!fs.existsSync(file.ruta)) return;

          let contenido = fs.readFileSync(file.ruta, "utf8");
          const coincidencias =
            contenido.split(session.textoBuscar).length - 1;

          if (coincidencias > 0) {
            contenido = contenido.split(session.textoBuscar).join(textoNuevo);
            fs.writeFileSync(file.ruta, contenido);
            totalReemplazos += coincidencias;
          }
        });

        await sock.sendMessage(jid, {
          text:
`* ✅ ʀᴇᴇᴍᴘʟᴀᴢᴏ ᴄᴏᴍᴘʟᴇᴛᴀᴅᴏ *

> ᴀʀᴄʜɪᴠᴏs ᴍᴏᴅɪғɪᴄᴀᴅᴏs:
* ${session.archivos.length} *

> ʀᴇᴇᴍᴘʟᴀᴢᴏs ʀᴇᴀʟɪᴢᴀᴅᴏs:
* ${totalReemplazos} *

♻️ ʀᴇɪɴɪᴄɪᴀɴᴅᴏ ᴘᴀʀᴀ ᴀᴘʟɪᴄᴀʀ ᴄᴀᴍʙɪᴏs...`
        });

        setTimeout(() => process.exit(0), 2000);
        return;
      }

      // 🔍 Nueva búsqueda
      if (!args.length) {
        await sock.sendMessage(jid, {
          text:
`* ⚠️ ᴜsᴏ ɪɴᴄᴏʀʀᴇᴄᴛᴏ*

> ᴜsᴀ:
* *.replace <ᴛᴇxᴛᴏ>*`
        });
        return;
      }

      const textoBuscar = args.join(" ");
      const projectRoot = process.cwd();

      let archivosEncontrados = [];
      let totalCoincidencias = 0;

      function buscarEnCarpeta(dir) {
        const archivos = fs.readdirSync(dir);

        archivos.forEach(file => {
          const fullPath = path.join(dir, file);

          if (
            fullPath.includes("node_modules") ||
            fullPath.includes(".git") ||
            fullPath.includes("replace-session.json")
          ) return;

          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            buscarEnCarpeta(fullPath);
          } else {
            try {
              const contenido = fs.readFileSync(fullPath, "utf8");

              if (contenido.includes(textoBuscar)) {
                const coincidencias =
                  contenido.split(textoBuscar).length - 1;

                archivosEncontrados.push({ ruta: fullPath });
                totalCoincidencias += coincidencias;
              }
            } catch {}
          }
        });
      }

      buscarEnCarpeta(projectRoot);

      if (!archivosEncontrados.length) {
        await sock.sendMessage(jid, {
          text: `* ❌ ɴᴏ sᴇ ᴇɴᴄᴏɴᴛʀᴀʀᴏɴ ᴄᴏɪɴᴄɪᴅᴇɴᴄɪᴀs.*`
        });
        return;
      }

      fs.writeFileSync(sessionFile, JSON.stringify({
        textoBuscar,
        archivos: archivosEncontrados
      }, null, 2));

      await sock.sendMessage(jid, {
        text:
`* 🔎 ʙᴜ́sǫᴜᴇᴅᴀ ᴄᴏᴍᴘʟᴇᴛᴀᴅᴀ *

> ᴀʀᴄʜɪᴠᴏs ᴀғᴇᴄᴛᴀᴅᴏs:
* ${archivosEncontrados.length} *

> ᴄᴏɪɴᴄɪᴅᴇɴᴄɪᴀs ᴛᴏᴛᴀʟᴇs:
* ${totalCoincidencias} *

✏️ ᴇsᴄʀɪʙᴇ ᴇʟ ɴᴜᴇᴠᴏ ᴛᴇxᴛᴏ
❌ ᴏ ᴇsᴄʀɪʙᴇ *ᴄᴀɴᴄᴇʟᴀʀ*`
      });

      const respuesta = await esperarRespuesta(sock, jid, sender);

      if (!respuesta || respuesta.toLowerCase() === "cancelar") {
        await sock.sendMessage(jid, {
          text: `* ❌ ᴏᴘᴇʀᴀᴄɪᴏ́ɴ ᴄᴀɴᴄᴇʟᴀᴅᴀ.*`
        });
        return;
      }

      const textoNuevo = respuesta;
      let totalReemplazos = 0;

      archivosEncontrados.forEach(file => {
        let contenido = fs.readFileSync(file.ruta, "utf8");
        const coincidencias =
          contenido.split(textoBuscar).length - 1;

        if (coincidencias > 0) {
          contenido = contenido.split(textoBuscar).join(textoNuevo);
          fs.writeFileSync(file.ruta, contenido);
          totalReemplazos += coincidencias;
        }
      });

      await sock.sendMessage(jid, {
        text:
`* ✅ ʀᴇᴇᴍᴘʟᴀᴢᴏ ᴄᴏᴍᴘʟᴇᴛᴀᴅᴏ *

> ᴀʀᴄʜɪᴠᴏs ᴍᴏᴅɪғɪᴄᴀᴅᴏs:
* ${archivosEncontrados.length} *

> ʀᴇᴇᴍᴘʟᴀᴢᴏs ʀᴇᴀʟɪᴢᴀᴅᴏs:
* ${totalReemplazos} *

♻️ ʀᴇɪɴɪᴄɪᴀɴᴅᴏ ᴘᴀʀᴀ ᴀᴘʟɪᴄᴀʀ ᴄᴀᴍʙɪᴏs...`
      });

      setTimeout(() => process.exit(0), 2000);

    } catch (err) {
      console.error("[REPLACE ERROR]", err);
      await sock.sendMessage(message.key.remoteJid, {
        text: `* ❌ ᴇʀʀᴏʀ ᴅᴜʀᴀɴᴛᴇ ᴇʟ ᴘʀᴏᴄᴇsᴏ.*`
      });
    }
  }
};

// ⏳ Esperar respuesta
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