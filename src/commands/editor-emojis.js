// ==============================================
// 🎨 Comando: .setemoji (ᴠᴇʀsɪᴏ́ɴ ᴛx ʟɪᴍᴘɪᴀ)
// ==============================================
const fs = require("fs");
const path = require("path");
const esAdmin = require("../../utils/admin");

module.exports = {
  name: "setemoji",
  alias: ["emojis", "cambiaremoji"],
  description: "ᴘᴇʀᴍɪᴛᴇ ᴇᴅɪᴛᴀʀ ʟᴏs ᴇᴍᴏᴊɪs ᴜsᴀᴅᴏs ᴇɴ ᴇʟ ʙᴏᴛ (sᴏʟᴏ ᴀᴅᴍɪɴs)",
  noCooldown: true,

  exec: async ({ sock, message, state }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;
      if (!jid.endsWith("@g.us")) return;

      // 🔒 sᴏʟᴏ ᴀᴅᴍɪɴs
      const isAdmin = await esAdmin(sock, jid, message);
      if (!isAdmin && !message.key.fromMe) {
        await sock.sendMessage(jid, {
          react: { text: "⚠️", key: message.key }
        });
        return;
      }

      // 📁 ᴀʀᴄʜɪᴠᴏ json
      const emojiPath = path.join(__dirname, "../json/emojis.json");
      if (!fs.existsSync(emojiPath)) {
        const defaults = {
          exito: "📌",
          error: "❌",
          advertencia: "⚠️",
          fuego: "🔥",
          admin: "👑",
          reloj: "🕓",
          musica: "🎵",
          juego: "🎮",
        };
        fs.mkdirSync(path.dirname(emojiPath), { recursive: true });
        fs.writeFileSync(emojiPath, JSON.stringify(defaults, null, 2));
      }

      const emojis = JSON.parse(fs.readFileSync(emojiPath, "utf8"));
      const keys = Object.keys(emojis);
      const texto = message.message?.conversation?.trim() || "";

      // 🧩 ᴘᴀsᴏ 1 — ᴍᴏsᴛʀᴀʀ ʟɪsᴛᴀ
      if (!state.awaitEmoji) {
        let msg =
`🎨 ᴇᴅɪᴛᴏʀ ᴅᴇ ᴇᴍᴏᴊɪs ᴅᴇʟ ʙᴏᴛ

> ʟɪsᴛᴀ ᴅɪsᴘᴏɴɪʙʟᴇ:

`;

        keys.forEach((k, i) => {
          msg += `${i + 1}. ${k}: ${emojis[k]}\n`;
        });

        msg +=
`
* ᴇsᴄʀɪʙᴇ ᴇʟ ɴᴜ́ᴍᴇʀᴏ ᴅᴇʟ ᴇᴍᴏᴊɪ ǫᴜᴇ ᴅᴇsᴇᴀs ᴄᴀᴍʙɪᴀʀ.`;

        await sock.sendMessage(jid, { text: msg });
        state.awaitEmoji = { step: "choose", keys, jid };
        return;
      }

      // 🧩 ᴘᴀsᴏ 2 — ᴇʟᴇɢɪʀ ᴇᴍᴏᴊɪ
      if (state.awaitEmoji.step === "choose") {
        if (!texto) return;

        const num = parseInt(texto);
        if (isNaN(num) || num < 1 || num > state.awaitEmoji.keys.length) return;

        const keyToChange = state.awaitEmoji.keys[num - 1];
        state.awaitEmoji = { step: "new", key: keyToChange, jid };

        await sock.sendMessage(jid, {
          text:
`✏️ ɴᴜᴇᴠᴏ ᴇᴍᴏᴊɪ

> ᴇsᴄʀɪʙᴇ ᴇʟ ɴᴜᴇᴠᴏ ᴇᴍᴏᴊɪ ᴘᴀʀᴀ:

${keyToChange}`
        });
        return;
      }

      // 🧩 ᴘᴀsᴏ 3 — ɢᴜᴀʀᴅᴀʀ ɴᴜᴇᴠᴏ ᴇᴍᴏᴊɪ
      if (state.awaitEmoji.step === "new") {
        if (!texto) return;

        const newEmoji = texto.trim();
        const key = state.awaitEmoji.key;
        const emojis = JSON.parse(fs.readFileSync(emojiPath, "utf8"));
        const oldEmoji = emojis[key];

        if (!newEmoji || newEmoji === oldEmoji) {
          await sock.sendMessage(jid, {
            text:
`⚠️ ᴇᴍᴏᴊɪ ɪɴᴠᴀ́ʟɪᴅᴏ

> ɴᴏ sᴇ ʀᴇᴀʟɪᴢᴀʀᴏɴ ᴄᴀᴍʙɪᴏs.`
          });
          delete state.awaitEmoji;
          return;
        }

        emojis[key] = newEmoji;
        fs.writeFileSync(emojiPath, JSON.stringify(emojis, null, 2));

        // 🧭 ʀᴇᴇᴍᴘʟᴀᴢᴏ sᴇɢᴜʀᴏ ᴇɴ ᴀʀᴄʜɪᴠᴏs
        const escapeRegex = s =>
          s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escapeRegex(oldEmoji), "g");

        const dirs = [
          path.join(__dirname),
          path.join(__dirname, "../utils"),
        ];

        const replaceInDir = dir => {
          try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              const full = path.join(dir, file);
              const stat = fs.statSync(full);
              if (stat.isDirectory()) replaceInDir(full);
              else if (full.endsWith(".js")) {
                let content = fs.readFileSync(full, "utf8");
                if (regex.test(content)) {
                  content = content.replace(regex, newEmoji);
                  fs.writeFileSync(full, content, "utf8");
                }
              }
            }
          } catch (err) {
            console.warn(`[SETEMOJI] No se pudo procesar ${dir}: ${err.message}`);
          }
        };

        dirs.forEach(replaceInDir);

        const msgFinal =
`* ✅ ᴇᴍᴏᴊɪ ᴀᴄᴛᴜᴀʟɪᴢᴀᴅᴏ

* ᴄʟᴀᴠᴇ: 
> ${key}

ᴄᴀᴍʙɪᴏ:
> ${oldEmoji}  →  ${newEmoji}

ᴇʟ ʀᴇᴇᴍᴘʟᴀᴢᴏ sᴇ ᴀᴘʟɪᴄᴏ́
ᴇɴ ᴄᴏᴍᴀɴᴅᴏs ʏ ᴇᴠᴇɴᴛᴏs.`;

        await sock.sendMessage(jid, { text: msgFinal });
        delete state.awaitEmoji;
        return;
      }

    } catch (err) {
      console.error("[SETEMOJI ERROR]", err);
      delete state.awaitEmoji;
      await sock.sendMessage(message.key.remoteJid, {
        text:
`❌ ᴇʀʀᴏʀ ᴀʟ ᴇᴊᴇᴄᴜᴛᴀʀ ᴇʟ ᴄᴏᴍᴀɴᴅᴏ sᴇᴛᴇᴍᴏᴊɪ.

> ɪɴᴛᴇ́ɴᴛᴀʟᴏ ɴᴜᴇᴠᴀᴍᴇɴᴛᴇ.`
      });
    }
  },
};
