// ===========================================================
// 🚪 Cᴏᴍᴀɴᴅᴏ: .kickfantasmas (SQLite + Fonts Originales)
// ===========================================================

const esAdmin = require("../../utils/admin");

module.exports = {
  name: "kickfantasmas",
  alias: ["expulsarfantasmas", "limpiarfantasmas", "expulsarinactivos"],
  description: "Eʟɪᴍɪɴᴀ ᴅᴇʟ ɢʀᴜᴘᴏ ᴀ ᴜꜱᴜᴀʀɪᴏꜱ ᴄᴏɴ ᴍᴇɴᴏꜱ ᴅᴇ 10 ᴍᴇɴꜱᴀᴊᴇꜱ (SQLite)",
  noCooldown: true,

  exec: async ({ sock, message, state }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;
      if (!jid.endsWith("@g.us")) return;

      // 👑 Verificar admin
      const isAdmin = await esAdmin(sock, jid, message);
      if (!isAdmin && !message.key.fromMe) {
        await sock.sendMessage(jid, {
          text: `🚫 *Aᴄᴄᴇsᴏ ᴅᴇɴᴇɢᴀᴅᴏ*\n> Sᴏʟᴏ ᴀᴅᴍɪɴɪꜱᴛʀᴀᴅᴏʀᴇꜱ ᴘᴜᴇᴅᴇɴ ᴇᴊᴇᴄᴜᴛᴀʀ ᴇꜱᴛᴇ ᴄᴏᴍᴀɴᴅᴏ.`,
        });
        return;
      }

      await sock.sendMessage(jid, { react: { text: "🔥", key: message.key } });

      // 👥 Participantes y admins
      const metadata = await sock.groupMetadata(jid);
      const participantes = metadata.participants.map((p) => p.id);
      const admins = metadata.participants.filter((p) => p.admin).map((p) => p.id);

      const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";

      // 📊 Obtener conteo por usuario (SQLite)
      const rows = state.db.prepare(`
        SELECT autor, COUNT(*) AS total
        FROM mensajes
        WHERE grupo = ?
        GROUP BY autor
      `).all(jid);

      const conteo = {};
      rows.forEach((r) => (conteo[r.autor] = r.total));

      // 👻 Detectar fantasmas (< 10 mensajes)
      const fantasmas = participantes
        .map((uid) => ({
          id: uid,
          mensajes: conteo[uid] || 0,
        }))
        .filter(
          (u) =>
            u.mensajes < 10 &&
            !admins.includes(u.id) &&
            u.id !== botNumber &&
            u.id !== sender
        );

      if (!fantasmas.length) {
        await sock.sendMessage(jid, {
          text: "✨ *Nᴏ ʜᴀʏ ғᴀɴᴛᴀꜱᴍᴀꜱ* ✨\n> Tᴏᴅᴏꜱ ᴛɪᴇɴᴇɴ ᴍᴀ́ꜱ ᴅᴇ 10 ᴍᴇɴꜱᴀᴊᴇꜱ.",
        });
        return;
      }

      // ⚠️ Aviso
      const aviso = `🚨 *Lɪᴍᴘɪᴇᴢᴀ ᴅᴇ ғᴀɴᴛᴀꜱᴍᴀꜱ ɪɴɪᴄɪᴀᴅᴀ* 🚨\n
> Sᴇ ᴅᴇᴛᴇᴄᴛᴀʀᴏɴ *${fantasmas.length}* ᴜꜱᴜᴀʀɪᴏꜱ ᴄᴏɴ ᴍᴇɴᴏꜱ ᴅᴇ *10 ᴍᴇɴꜱᴀᴊᴇꜱ*.\n> Sᴇʀᴀ́ɴ ᴇxᴘᴜʟꜱᴀᴅᴏꜱ ᴇɴ ᴘᴏᴄᴏꜱ ꜱᴇɢᴜɴᴅᴏꜱ...`;

      await sock.sendMessage(jid, { text: aviso });

      // 🚪 Expulsión
      for (const u of fantasmas) {
        try {
          await sock.groupParticipantsUpdate(jid, [u.id], "remove");
          await new Promise((r) => setTimeout(r, 1500));
        } catch (err) {
          console.error(`❌ Error expulsando ${u.id}:`, err);
        }
      }

      // 🧾 Reporte final (manteniendo tus fonts)
      let textoFinal = `> 👻 *Fᴀɴᴛᴀꜱᴍᴀꜱ Eʟɪᴍɪɴᴀᴅᴏꜱ*

🚫 *Usᴜᴀʀɪᴏꜱ ʙᴀɴᴇᴀᴅᴏꜱ:* 
> ${fantasmas.length}

📉 *Cʀɪᴛᴇʀɪᴏ:* 
> ᴍᴇɴᴏꜱ ᴅᴇ 10 ᴍᴇɴꜱᴀᴊᴇꜱ
`;

      fantasmas.forEach((u, i) => {
        const icon = u.mensajes === 0 ? "💀" : "🕸️";
        textoFinal += `\n│ ${i + 1}. ${icon} @${u.id.split("@")[0]} — ${u.mensajes} ᴍᴇɴꜱᴀᴊᴇꜱ`;
      });

      textoFinal += `\n
> 👑 *Cᴏᴍᴀɴᴅᴏ ᴇᴊᴇᴄᴜᴛᴀᴅᴏ ᴘᴏʀ:* @${sender.split("@")[0]}
`;

      await sock.sendMessage(jid, {
        text: textoFinal,
        mentions: fantasmas.map((u) => u.id).concat(sender),
      });
    } catch (err) {
      console.error("[KICKFANTASMAS SQLITE ERROR]", err);
      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ *Eʀʀᴏʀ ɪɴᴇꜱᴘᴇʀᴀᴅᴏ ᴀʟ ᴇᴊᴇᴄᴜᴛᴀʀ ʟᴀ ʟɪᴍᴘɪᴇᴢᴀ.*",
      });
    }
  },
};
