const fs = require('fs');
const esAdmin = require('../../utils/admin');
const images = require('../../utils/images.js');

// 🧩 Registro antispam
const cooldowns = new Map();

module.exports = {
  name: 'todos',
  alias: [],
  description: 'Menciona a todos los participantes (solo admins)',
  noCooldown: true,

  
  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;
      if (!jid.endsWith('@g.us')) return;

      // 🚫 Antispam
      const key = `${jid}:${sender}:todos`;
      const now = Date.now();
      if (cooldowns.has(key) && now - cooldowns.get(key) < 10000) return; // 10s cooldown
      cooldowns.set(key, now);

      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
        return;
      }

      const meta = await sock.groupMetadata(jid);
      const members = meta.participants || [];
      if (!members.length) {
        await sock.sendMessage(jid, { text: '⚠️ No hay participantes.' });
        return;
      }

      let texto = `📣 *Aviso grupal* 📣\n\n👥 Participantes (${members.length}):\n`;
      const mentions = [];
      for (const m of members) {
        texto += `• @${m.id.split('@')[0]}\n`;
        mentions.push(m.id);
      }

      const imgPath = images.todos;
      if (imgPath && fs.existsSync(imgPath)) {
        await sock.sendMessage(jid, {
          image: { url: imgPath },
          caption: texto,
          mentions,
        });
      } else {
        await sock.sendMessage(jid, { text: texto, mentions });
      }
    } catch (err) {
      console.error('[TODOS ERROR]', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Error al mencionar a todos.',
      });
    }
  },
};
