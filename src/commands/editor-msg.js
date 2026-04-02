// ===========================================================
// 💌 Cᴏᴍᴀɴᴅᴏ: .ᴍsɢ + ʀᴇsᴇᴛ
// Gᴜᴀʀᴅᴀ ᴏ ʀᴇsᴛᴀʙʟᴇᴄᴇ ᴍᴇɴsᴀᴊᴇs ᴅᴇ ʙɪᴇɴᴠᴇɴɪᴅᴀ ᴏ ᴅᴇsᴘᴇᴅɪᴅᴀ
// Aᴄᴇᴘᴛᴀ: @ᴜsᴇʀ @ʜᴏʀᴀ @ғᴇᴄʜᴀ @ᴅɪᴀ @ᴍɪᴇᴍʙʀᴏs @ᴛᴀɢ
// ===========================================================

const fs = require("fs");
const path = require("path");

const cooldowns = new Map();

module.exports = {
  name: "msg",
  alias: ["setmsg", "resetmsg"],
  description: "Gᴜᴀʀᴅᴀ ᴏ ʀᴇsᴛᴀʙʟᴇᴄᴇ ᴍᴇɴsᴀᴊᴇs ᴘᴇʀsᴏɴᴀʟɪᴢᴀᴅᴏs.",
  noCooldown: true,

  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;
      if (!jid.endsWith("@g.us")) return;

      // ── Aɴᴛɪ-sᴘᴀᴍ ──
      const key = `${jid}:${sender}:msg`;
      const now = Date.now();
      if (cooldowns.has(key) && now - cooldowns.get(key) < 7000) return;
      cooldowns.set(key, now);

      const meta = await sock.groupMetadata(jid);
      const admins = meta.participants.filter((p) => p.admin).map((p) => p.id);

      if (!admins.includes(sender)) {
        await sock.sendMessage(jid, { react: { text: "🚫", key: message.key } });
        return;
      }

      const text =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text;
      if (!text) return;

      const partes = text.trim().split(" ");
      const subcmd = partes[1]?.toLowerCase(); // bienvenida | despedida | reset
      const argumento = partes[2]?.toLowerCase(); // usada en reset

      // ── Vᴀʟɪᴅᴀᴄɪᴏ́ɴ ──
      if (!["bienvenida", "despedida", "reset"].includes(subcmd)) {
        await sock.sendMessage(jid, {
          text:
            `─❰ ⚙️ Usᴏ Cᴏʀʀᴇᴄᴛᴏ ❱\n\n` +
            `📝 Gᴜᴀʀᴅᴀʀ ᴍᴇɴsᴀᴊᴇ:\n` +
            `• *.ᴍsɢ ʙɪᴇɴᴠᴇɴɪᴅᴀ [ᴛᴇxᴛᴏ]*\n` +
            `• *.ᴍsɢ ᴅᴇsᴘᴇᴅɪᴅᴀ [ᴛᴇxᴛᴏ]*\n\n` +
            `♻️ Rᴇsᴛᴀʙʟᴇᴄᴇʀ ᴘᴏʀ ᴅᴇғᴇᴄᴛᴏ:\n` +
            `• *.ᴍsɢ ʀᴇsᴇᴛ ʙɪᴇɴᴠᴇɴɪᴅᴀ*\n` +
            `• *.ᴍsɢ ʀᴇsᴇᴛ ᴅᴇsᴘᴇᴅɪᴅᴀ*\n\n` +
            `🔖 Pʟᴀᴄᴇʜᴏʟᴅᴇʀs:\n` +
            `@ᴜsᴇʀ @ᴛᴀɢ @ʜᴏʀᴀ @ғᴇᴄʜᴀ @ᴅɪᴀ @ᴍɪᴇᴍʙʀᴏs`,
        });
        return;
      }

      // ============================================================
      // ♻️ 1) Rᴇsᴇᴛ ᴀ ᴍᴇɴsᴀᴊᴇ ᴘᴏʀ ᴅᴇғᴇᴄᴛᴏ
      // ============================================================
      if (subcmd === "reset") {
        if (!["bienvenida", "despedida"].includes(argumento)) {
          await sock.sendMessage(jid, {
            text:
              `⚠️ Usᴀ:\n` +
              `• *.ᴍsɢ ʀᴇsᴇᴛ ʙɪᴇɴᴠᴇɴɪᴅᴀ*\n` +
              `• *.ᴍsɢ ʀᴇsᴇᴛ ᴅᴇsᴘᴇᴅɪᴅᴀ*`,
          });
          return;
        }

        const dir = path.join(__dirname, "../../data/welcome", jid);
        const filePath = path.join(dir, `${argumento}.txt`);

        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await sock.sendMessage(jid, {
          text: `♻️ Mᴇɴsᴀᴊᴇ ᴅᴇ *${argumento.toUpperCase()}* ʀᴇsᴛᴀʙʟᴇᴄɪᴅᴏ ᴀʟ ᴍᴏᴅᴏ ᴘᴏʀ ᴅᴇғᴇᴄᴛᴏ.`,
        });

        return;
      }

      // ============================================================
      // 💾 2) Gᴜᴀʀᴅᴀʀ ᴍᴇɴsᴀᴊᴇ ᴘᴇʀsᴏɴᴀʟɪᴢᴀᴅᴏ
      // ============================================================
      const tipo = subcmd;
      const contenido = text.slice(text.indexOf(tipo) + tipo.length).trim();

      if (!contenido) {
        await sock.sendMessage(jid, {
          text:
            `⚠️ Dᴇʙᴇs ᴇsᴄʀɪʙɪʀ ᴄᴏɴᴛᴇɴɪᴅᴏ.\n\n` +
            `Eᴊᴇᴍᴘʟᴏ:\n> *.ᴍsɢ ${tipo} Hᴏʟᴀ @ᴜsᴇʀ*`,
        });
        return;
      }

      // ── Gᴜᴀʀᴅᴀʀ ──
      const dir = path.join(__dirname, "../../data/welcome", jid);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, `${tipo}.txt`);
      fs.writeFileSync(filePath, contenido);

      // ── Pʀᴇᴠɪsᴜᴀʟɪᴢᴀᴄɪᴏ́ɴ ──
      const fecha = new Date().toLocaleDateString("es-MX");
      const hora = new Date().toLocaleTimeString("es-MX", { hour12: false });

      const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
      const dia = dias[new Date().getDay()];

      const preview = contenido
        .replace(/@user/g, "@usuario")
        .replace(/@tag/g, "@usuario")
        .replace(/@hora/g, hora)
        .replace(/@fecha/g, fecha)
        .replace(/@dia/g, dia)
        .replace(/@miembros/g, meta.participants.length);

      const resumen =
        `─❰ 💌 Mᴇɴsᴀᴊᴇ Aᴄᴛᴜᴀʟɪᴢᴀᴅᴏ ❱\n\n` +
        `📄 Tɪᴘᴏ: *${tipo.toUpperCase()}*\n` +
        `📅 Fᴇᴄʜᴀ: ${fecha}\n` +
        `⌚ Hᴏʀᴀ: ${hora}\n` +
        `📆 Dɪ́ᴀ: ${dia}\n\n` +
        `📝 Pʀᴇᴠɪsᴜᴀʟɪᴢᴀᴄɪᴏ́ɴ:\n` +
        `${preview}\n\n` +
        `📂 Gᴜᴀʀᴅᴀᴅᴏ ᴇɴ:\n> data/welcome/${jid}/${tipo}.txt`;

      await sock.sendMessage(jid, { text: resumen });

    } catch (err) {
      console.error("[MSG ERROR]", err);
      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Eʀʀᴏʀ ᴀʟ ᴇᴊᴇᴄᴜᴛᴀʀ ᴇʟ ᴄᴏᴍᴀɴᴅᴏ.",
      });
    }
  },
};
