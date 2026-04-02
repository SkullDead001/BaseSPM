// ==============================================
// 📱 Cᴏᴍᴀɴᴅᴏ: .agg1
// Pᴇʀᴍɪᴛᴇ ᴀɢʀᴇɢᴀʀ ᴜɴ ᴏ ᴠᴀʀɪᴏꜱ ɴᴜ́ᴍᴇʀᴏꜱ ᴀ ʟᴀ ʟɪꜱᴛᴀ ɢʟᴏʙᴀʟ.
// ==============================================
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "agg1",
  alias: ["addnum", "agregar1"],
  description: "Aɢʀᴇɢᴀ ᴜɴ ᴏ ᴠᴀʀɪᴏꜱ ɴᴜ́ᴍᴇʀᴏꜱ ᴀ ʟᴀ ʟɪꜱᴛᴀ ɢʟᴏʙᴀʟ.",
  noCooldown: true,

  exec: async ({ sock, message, args }) => {
    try {
      const jid = message.key.remoteJid;
      const jsonPath = path.join(__dirname, "../../data/ratas/numeros.json");

      // 📂 Cʀᴇᴀʀ ᴀʀᴄʜɪᴠᴏ ꜱɪ ɴᴏ ᴇxɪꜱᴛᴇ
      if (!fs.existsSync(jsonPath)) {
        fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
        fs.writeFileSync(jsonPath, JSON.stringify([], null, 2));
      }

      // 📋 Lᴇᴇʀ ʟɪꜱᴛᴀ ᴇxɪꜱᴛᴇɴᴛᴇ
      const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      const listaActual = Array.isArray(data) ? data.map(String) : [];

      // 🧾 Oʙᴛᴇɴᴇʀ ᴇʟ ᴛᴇxᴛᴏ ᴄᴏᴍᴘʟᴇᴛᴏ (incluye multi-línea)
      let fullText =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        args.join(" ");

      // Qᴜɪᴛᴀʀ ᴇʟ ᴘʀᴇꜰɪᴊᴏ (.agg1, .addnum, .agregar1, etc.)
      fullText = (fullText || "").replace(/^\.\S+/, "").trim();

      // ⚠️ Sɪ ɴᴏ ʜᴀʏ ɴᴜ́ᴍᴇʀᴏꜱ
      if (!fullText) {
        await sock.sendMessage(jid, {
          text: `⚠️ Dᴇʙᴇꜱ ᴇꜱᴄʀɪʙɪʀ ᴀʟ ᴍᴇɴᴏꜱ ᴜɴ ɴᴜ́ᴍᴇʀᴏ.\n\nEᴊᴇᴍᴘʟᴏ:\n> .agg1 1🐀+525662532793\n> 2🐀+523313427339\n> 3🐀+52 33 1342 0117`
        });
        return;
      }

      // 🔎 Bᴜꜱᴄᴀʀ ɴᴜ́ᴍᴇʀᴏꜱ ᴅᴇ ᴛᴇʟᴇ́ꜰᴏɴᴏ ᴅᴇɴᴛʀᴏ ᴅᴇʟ ᴛᴇxᴛᴏ
      // - Acepta cosas como:
      //   1🐀+525662532793
      //   4🐀+52 33 1342 0117
      //   Maldita Rata 👉🏻+52 473 329 5643
      //   o incluso solo: +52 473 329 5643
      //
      // Regla:
      //   - Buscar secuencias que EMPIECEN en '+' y tengan al menos 8 dígitos.
      //   - Opcionalmente también soportar líneas sin '+' pero con >= 8 dígitos.
      const newNumbers = [];

      // Dividimos por líneas para soportar listas largas pegadas
      const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

      for (const line of lines) {
        // 1️⃣ Si la línea contiene '+', tomamos TODO desde el ÚLTIMO '+'
        if (line.includes("+")) {
          const plusIndex = line.lastIndexOf("+");
          let candidate = line.slice(plusIndex); // desde '+' hasta el final

          // Limpiar: solo dejar dígitos y '+'
          candidate = candidate.replace(/[^\d+]/g, "");

          // Normalizar: solo un '+' al inicio, el resto se quita
          if (candidate.includes("+")) {
            candidate =
              "+" +
              candidate
                .replace(/\+/g, "") // quitar todos los '+'
                .replace(/^\+/, ""); // por si quedara alguno al inicio
          }

          const digitsCount = (candidate.match(/\d/g) || []).length;

          if (digitsCount >= 8 && digitsCount <= 15) {
            newNumbers.push(candidate);
          }

          continue;
        }

        // 2️⃣ Si no tiene '+', pero hay >= 8 dígitos, intentamos tomarlo como número
        const onlyDigits = (line.match(/\d/g) || []).join("");
        if (onlyDigits.length >= 8 && onlyDigits.length <= 15) {
          newNumbers.push(onlyDigits);
        }
      }

      if (!newNumbers.length) {
        await sock.sendMessage(jid, { text: "⚠️ Nᴏ ꜱᴇ ᴅᴇᴛᴇᴄᴛᴀʀᴏɴ ɴᴜ́ᴍᴇʀᴏꜱ ᴠᴀ́ʟɪᴅᴏꜱ." });
        return;
      }

      // 🚫 Eᴠɪᴛᴀʀ ᴅᴜᴘʟɪᴄᴀᴅᴏꜱ (comparando por dígitos)
      let added = 0;
      const agregados = [];

      const normalizar = (num) => (num.match(/\d/g) || []).join(""); // solo dígitos

      const existentesNorm = new Set(listaActual.map(normalizar));

      for (const num of newNumbers) {
        const norm = normalizar(num);
        if (!existentesNorm.has(norm)) {
          listaActual.push(num);
          existentesNorm.add(norm);
          added++;
          agregados.push(num);
        }
      }

      fs.writeFileSync(jsonPath, JSON.stringify(listaActual, null, 2), "utf8");

      // 🧾 Rᴇꜱᴜᴍᴇɴ ᴅᴇ ᴀᴄᴄɪᴏ́ɴ
      const resumen = `╭─❰ 📌 Rᴇɢɪꜱᴛʀᴏ Eᴘᴇᴄᴛᴀᴄᴜʟᴀʀ 📌 ❱
│
├ 📌 Nᴜ́ᴍᴇʀᴏꜱ ᴀɢʀᴇɢᴀᴅᴏꜱ: *${added}*
├ 🗂️ Tᴏᴛᴀʟ ᴀᴄᴛᴜᴀʟ: *${listaActual.length}*
│
├ 🧾 Lɪꜱᴛᴀ ɴᴜᴇᴠᴀꜱ ᴇɴᴛʀᴀᴅᴀꜱ:
${agregados.length ? agregados.map((n) => `│ > ${n}`).join("\n") : "│ (Sɪɴ ɴᴜᴇᴠᴏꜱ, ᴛᴏᴅᴏꜱ ʏᴀ ᴇꜱᴛᴀʙᴀɴ ʀᴇɢɪꜱᴛʀᴀᴅᴏꜱ)"} 
│
╰──────────────`;

      await sock.sendMessage(jid, {
        text: resumen,
      });

    } catch (err) {
      console.error("[AGG1 ERROR]", err);
      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Eʀʀᴏʀ ᴀʟ ᴀɢʀᴇɢᴀʀ ʟᴏꜱ ɴᴜ́ᴍᴇʀᴏꜱ."
      });
    }
  },
};
