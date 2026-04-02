// =======================================================
// ⚔️ Cᴏᴍᴀɴᴅᴏ: .ɴᴏᴘʀɪᴠᴀᴅᴏ
// Aᴄᴛɪᴠᴀ ᴏ ᴅᴇsᴀᴄᴛɪᴠᴀ ᴇʟ ʙʟᴏǫᴜᴇᴏ ᴀᴜᴛᴏᴍᴀ́ᴛɪᴄᴏ ᴅᴇ ᴍᴇɴsᴀᴊᴇs ᴘʀɪᴠᴀᴅᴏs
// Sᴏʟᴏ ᴀᴅᴍɪɴs ᴏ ᴇʟ ʙᴏᴛ (ʟᴏ́ɢɪᴄᴀ ɪɢᴜᴀʟ ǫᴜᴇ .ᴅᴇʟ)
// =======================================================

const fs = require("fs");
const path = require("path");
const esAdmin = require("../../utils/admin");

const CONFIG_PATH = path.join(process.cwd(), "data/config/noprivado.json");

module.exports = {
  name: "noprivado",
  alias: ["npv", "privado"],
  description: "Aᴄᴛɪᴠᴀ ᴏ ᴅᴇsᴀᴄᴛɪᴠᴀ ᴇʟ ʙʟᴏǫᴜᴇᴏ ᴅᴇ ᴍᴇɴsᴀᴊᴇs ᴘʀɪᴠᴀᴅᴏs.",
  noCooldown: true,

  exec: async ({ sock, message, args }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || message.key.remoteJid;

      // ── 🔒 Pᴇʀᴍɪsᴏs ──
      if (jid.endsWith("@g.us")) {
        const admin = await esAdmin(sock, jid, message);
        if (!admin && !message.key.fromMe) {
          await sock.sendMessage(jid, {
            react: { text: "⚠️", key: message.key }
          });
          return;
        }
      } else {
        const senderId = sender.split("@")[0];
        const isOwner = global.owner && global.owner.includes(senderId);
        if (!isOwner && !message.key.fromMe) {
          await sock.sendMessage(jid, {
            react: { text: "⚠️", key: message.key }
          });
          return;
        }
      }

      // ── 📁 Cᴏɴғɪɢᴜʀᴀᴄɪᴏ́ɴ ──
      const dir = path.dirname(CONFIG_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      let config = { enabled: true };
      if (fs.existsSync(CONFIG_PATH)) {
        try {
          config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
        } catch {}
      }

      const rawArg = args.join(" ").trim().toLowerCase();

      // =========================
      // 🟢 Aᴄᴛɪᴠᴀʀ
      // =========================
      if (["on", "activar", "encender"].includes(rawArg)) {
        config.enabled = true;
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

        await sock.sendMessage(jid, {
          text:
`> ⚔️ Bʟᴏǫᴜᴇᴏ Aᴄᴛɪᴠᴀᴅᴏ ❱

🚷 Eʟ ʙᴏᴛ ʙʟᴏǫᴜᴇᴀʀᴀ́ ᴀ ᴄᴜᴀʟǫᴜɪᴇʀ ᴜsᴜᴀʀɪᴏ
ǫᴜᴇ ʟᴇ ᴇsᴄʀɪʙᴀ ᴘᴏʀ ᴘʀɪᴠᴀᴅᴏ.`,
        });

        await sock.sendMessage(jid, {
          react: { text: "✅", key: message.key }
        });
        return;
      }

      // =========================
      // 🔴 Dᴇsᴀᴄᴛɪᴠᴀʀ
      // =========================
      if (["off", "desactivar", "apagar"].includes(rawArg)) {
        config.enabled = false;
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

        await sock.sendMessage(jid, {
          text:
`> ⚙️ Bʟᴏǫᴜᴇᴏ Dᴇsᴀᴄᴛɪᴠᴀᴅᴏ ❱

💬 Eʟ ʙᴏᴛ ᴘᴏᴅʀᴀ́ ʀᴇᴄɪʙɪʀ
ᴍᴇɴsᴀᴊᴇs ᴘʀɪᴠᴀᴅᴏs ɴᴏʀᴍᴀʟᴍᴇɴᴛᴇ.`,
        });

        await sock.sendMessage(jid, {
          react: { text: "🟠", key: message.key }
        });
        return;
      }

      // =========================
      // 📦 Esᴛᴀᴅᴏ Aᴄᴛᴜᴀʟ
      // =========================
      const estado = config.enabled ? "🟢 Aᴄᴛɪᴠᴀᴅᴏ" : "🔴 Dᴇsᴀᴄᴛɪᴠᴀᴅᴏ";

      await sock.sendMessage(jid, {
        text:
`> ⚙️ Bʟᴏǫᴜᴇᴏ ᴅᴇ Pʀɪᴠᴀᴅᴏs ❱

* 🛡️ Usᴏs:
> • *.ɴᴏᴘʀɪᴠᴀᴅᴏ ᴏɴ* → Aᴄᴛɪᴠᴀʀ
> • *.ɴᴏᴘʀɪᴠᴀᴅᴏ ᴏғғ* → Dᴇsᴀᴄᴛɪᴠᴀʀ

📦 Esᴛᴀᴅᴏ:
> ${estado}`,
      });

      await sock.sendMessage(jid, {
        react: { text: config.enabled ? "🟢" : "🔴", key: message.key }
      });

    } catch (err) {
      console.error("[NOPRIVADO ERROR]", err);
      await sock.sendMessage(message.key.remoteJid, {
        react: { text: "❌", key: message.key }
      });
    }
  },
};
