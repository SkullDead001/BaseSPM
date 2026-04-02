// ===========================================================
// 👻 Comando: .fantasmas (Versión FINAL SQLite)
// ===========================================================

const esAdmin = require("../../utils/admin");

module.exports = {
  name: "fantasmas",
  alias: ["inactivos", "muertos", "ghosts"],
  description: "Muestra usuarios con menos de 10 mensajes en el grupo",
  noCooldown: true,

  exec: async ({ sock, message, state }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;

      if (!jid.endsWith("@g.us")) return;

      // Verificar admin
      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, { react: { text: "⚠️", key: message.key } });
        return;
      }

      // Obtener participantes reales del grupo
      const metadata = await sock.groupMetadata(jid);
      const participantes = metadata.participants.map(p => p.id);

      // Obtener conteo desde SQLite
      const stmt = state.db.prepare(`
        SELECT autor, COUNT(*) AS total
        FROM mensajes
        WHERE grupo = ?
        GROUP BY autor
      `);

      const rows = stmt.all(jid);

      // Convertimos SQL a un mapa
      const conteo = {};
      rows.forEach(r => conteo[r.autor] = r.total);

      // Armar lista de fantasmas
      const fantasmas = participantes
        .map(uid => ({
          id: uid,
          mensajes: conteo[uid] || 0
        }))
        .filter(u => u.mensajes < 10);

      if (!fantasmas.length) {
        await sock.sendMessage(jid, { text: "✨ Todos son activos ✨" });
        return;
      }

      fantasmas.sort((a, b) => a.mensajes - b.mensajes);

      let texto = `> 👻 *Fᴀɴᴛᴀsᴍᴀs ᴅᴇʟ Gʀᴜᴘᴏ* 👻n\n`;

      fantasmas.forEach((u, i) => {
        const icon = u.mensajes === 0 ? "💀" : "🕸️";
        texto += `${i + 1}. ${icon} @${u.id.split("@")[0]} — ${u.mensajes} mensajes\n`;
      });

      await sock.sendMessage(jid, {
        text: texto,
        mentions: fantasmas.map(u => u.id),
      });

    } catch (err) {
      console.error("[FANTASMAS SQLITE ERROR]", err);
      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Error al generar la lista de fantasmas.",
      });
    }
  },
};
