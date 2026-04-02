// ===========================================================
// 🧾 Cᴏᴍᴀɴᴅᴏ: .ratas
// Compatible 100% con extracción masiva del comando .agg1
// Limpieza total, coincidencia precisa y detección automática
// ===========================================================

const fs = require("fs");
const path = require("path");

// 🕒 Anti-spam temporal (por grupo o usuario)
const cooldowns = new Map();

const RATAS_FILE = path.join(__dirname, "../../data/ratas/numeros.json");

// ===========================================================
// 🧼 Función de limpieza: remueve TODO excepto dígitos
// ===========================================================
function clean(num = "") {
  return String(num).replace(/\D+/g, ""); // deja solo 0-9
}

// ===========================================================
// 📦 Función para obtener lista de números registrados
// (limpios y compatibles con .agg1)
// ===========================================================
function getListaRatas() {
  if (!fs.existsSync(RATAS_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(RATAS_FILE, "utf8"));
    if (!Array.isArray(data)) return [];

    // Sanitizar todos los números guardados
    return data
      .map((n) => clean(n))
      .filter((n) => n.length >= 5); // seguridad mínima
  } catch {
    return [];
  }
}

module.exports = {
  name: "ratas",
  alias: ["numeros", "vernums", "fichados", "rts", "listanumeros"],
  description: "Mᴜᴇꜱᴛʀᴀ ʟᴀ ʟɪsᴛᴀ ᴅᴇ ɴᴜ́ᴍᴇʀᴏꜱ ғɪᴄʜᴀᴅᴏꜱ ʏ ᴀᴠɪꜱᴀ ꜱɪ ᴜɴᴏ ᴇɴᴛʀᴀ ᴀʟ ɢʀᴜᴘᴏ.",
  noCooldown: true,

  // ===========================================================
  // 📜 Comando manual → muestra lista de fichados
  // ===========================================================
  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;
      const key = `${jid}:${sender}:ratas`;

      // 🛡️ Anti-spam (10s)
      const now = Date.now();
      if (cooldowns.has(key) && now - cooldowns.get(key) < 10000) return;
      cooldowns.set(key, now);

      const lista = getListaRatas();

      if (!lista.length) {
        await sock.sendMessage(jid, { text: "⚠️ *Lᴀ ʟɪsᴛᴀ ᴅᴇ ʀᴀᴛᴀꜱ ᴇꜱᴛᴀ́ ᴠᴀᴄɪ́ᴀ.*" });
        return;
      }

      // Crear vista ordenada
      let texto = "📋 *Lɪꜱᴛᴀ ᴅᴇ ɴᴜ́ᴍᴇʀᴏꜱ ғɪᴄʜᴀᴅᴏꜱ*\n\n";
      lista.forEach((num, i) => {
        texto += `${i + 1}. ${num}\n`;
      });

      await sock.sendMessage(jid, { text: texto });

    } catch (err) {
      console.error("[RATAS ERROR]", err);
      await sock.sendMessage(message.key.remoteJid, {
        react: { text: "❌", key: message.key },
      });
    }
  },

  // ===========================================================
  // 📢 Evento → Detección automática al entrar alguien
  // Totalmente compatible con formato masivo de .agg1
  // ===========================================================
  onGroupParticipantsUpdate: async (sock, update) => {
    try {
      const { id: jid, participants, action } = update;
      if (action !== "add" || !participants?.length) return;

      const lista = getListaRatas();
      if (!lista.length) return;

      for (const userJid of participants) {
        const numero = clean(userJid.split("@")[0]); // limpia número real

        // Coincidencia exacta entre números limpios
        const coincidente = lista.find((r) => clean(r) === numero);

        if (coincidente) {
          console.log(`[RATAS] ⚠️ Detectado número fichado: ${numero}`);

          await new Promise((r) => setTimeout(r, 2000));

          await sock.sendMessage(jid, {
            text: `🚨 *Aʟᴇʀᴛᴀ ᴅᴇ Sᴇɢᴜʀɪᴅᴀᴅ* 🚨\n\n` +
                  `> 📞 *${numero}* ʜᴀ ɪɴɢʀᴇꜱᴀᴅᴏ ᴀʟ ɢʀᴜᴘᴏ.\n` +
                  `> Sᴇ ᴇɴᴄᴜᴇɴᴛʀᴀ ɴᴜᴍᴇʀᴀᴅᴏ ᴄᴏᴍᴏ *ʀᴀᴛᴀ* 🐀\n\n` +
                  `⚠️ Rᴇᴠɪꜱᴀ ᴇꜱᴛᴇ ɪɴɢʀᴇꜱᴏ.`,
            mentions: [userJid],
          });
        }
      }
    } catch (err) {
      console.error("[RATAS EVENT ERROR]", err);
    }
  },
};
