const fs = require("fs");
const path = require("path");

// 🔒 Inicialización global segura
global.awaitSetImage ??= new Map();

module.exports = {
  name: "set",
  description: "Guarda información dinámica con imagen opcional",
  noCooldown: true,

  exec: async ({ sock, message, sendSafe }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;

      // ❌ Solo grupos
      if (!jid.endsWith("@g.us")) {
        await sendSafe(sock, jid, {
          text: "⚠️ Este comando solo funciona en grupos."
        });
        return;
      }

      // =========================
      // 📥 Obtener texto completo
      // =========================
      const fullText =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        "";

      if (!fullText.startsWith(".")) return;

      const cmdName = fullText.slice(1).trim().split(/\s+/)[0].toLowerCase();
      const name = cmdName.replace(/^set/, "").trim();

      const content = fullText
        .slice(fullText.indexOf(cmdName) + cmdName.length)
        .trim();

      // =========================
      // 📌 Validación básica
      // =========================
      if (!name) {
        await sendSafe(sock, jid, {
          text: "⚠️ Uso correcto:\n.set<nombre> texto"
        });
        return;
      }

      const baseDir = path.resolve(process.cwd(), "data", "docs", jid);
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      const textPath = path.join(baseDir, `${name}.txt`);
      const imagePath = path.join(baseDir, `${name}.png`);

      const lowerContent = content.toLowerCase();

      // =========================
      // 🗑️ ELIMINAR IMAGEN
      // =========================
      if (["off", "remove", "sinimagen", "noimg"].includes(lowerContent)) {

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }

        await sendSafe(sock, jid, {
          text:
`* *🗑️ Iᴍᴀɢᴇɴ Eʟɪᴍɪɴᴀᴅᴀ*
> *${name}*

* *Lᴀ ɪɴғᴏʀᴍᴀᴄɪᴏ́ɴ sᴇɢᴜɪʀᴀ́ ᴠɪsɪʙʟᴇ sɪɴ ɪᴍᴀɢᴇɴ.*`
        });

        return;
      }

      // =========================
      // ⚠️ Validar texto
      // =========================
      if (!content) {
        await sendSafe(sock, jid, {
          text: "⚠️ Debes agregar texto."
        });
        return;
      }

      // =========================
      // 💾 Guardar texto
      // =========================
      fs.writeFileSync(textPath, content, "utf8");

      // =========================
      // 📣 Aviso con estilo original
      // =========================
      await sendSafe(sock, jid, {
        text:
`* *✅ Iɴғᴏʀᴍᴀᴄɪᴏɴ ɢᴜᴀʀᴅᴀᴅᴀ*
> *${name}*

* *Eɴᴠɪᴀ ᴜɴᴀ ɪᴍᴀɢᴇɴ _{ᴏᴘᴄɪᴏɴᴀʟ}_ ᴘᴀʀᴀ ǫᴜᴇ sᴇ ᴠᴇᴀ ᴊᴜɴᴛᴏ ᴄᴏɴ ʟᴀ ɪɴғᴏʀᴍᴀᴄɪᴏɴ*
> ᴛɪᴇᴍᴘᴏ ᴇsᴛɪᴍᴀᴅᴏ 60s`
      });

      // =========================
      // 🖼️ Activar espera opcional
      // =========================
      global.awaitSetImage.set(jid, {
        name,
        author: sender,
        expires: Date.now() + 60_000
      });

      setTimeout(() => {
        const pending = global.awaitSetImage.get(jid);
        if (pending && pending.name === name) {
          global.awaitSetImage.delete(jid);
        }
      }, 60_000);

    } catch (err) {
      console.error("[SET COMMAND ERROR]", err);
      await sendSafe(sock, message.key.remoteJid, {
        text: "❌ Error al guardar la información."
      });
    }
  }
};