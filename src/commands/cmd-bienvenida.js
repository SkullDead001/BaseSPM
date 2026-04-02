const fs = require('fs');
const path = require('path');
const esAdmin = require('../../utils/admin');

// 🧩 Antispam
const cooldowns = new Map();

module.exports = {
  name: 'bienvenida',
  alias: [],
  description: 'Activa o desactiva los mensajes de bienvenida (solo admins)',
  noCooldown: true,
  
  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;
      if (!jid.endsWith('@g.us')) return;

      // 🚫 Antispam
      const key = `${jid}:${sender}:bienvenida`;
      const now = Date.now();
      if (cooldowns.has(key) && now - cooldowns.get(key) < 5000) return;
      cooldowns.set(key, now);

      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, { react: { text: '🚫', key: message.key } });
        return;
      }

      const dir = path.join(__dirname, `../../data/config/${jid}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, `bienvenida.json`);
      let current = { enabled: true };
      if (fs.existsSync(filePath)) current = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      current.enabled = !current.enabled;
      fs.writeFileSync(filePath, JSON.stringify(current, null, 2));

      await sock.sendMessage(jid, {
        text: `✅ Exɪᴛᴏ ✅\n* Lᴀ ʙɪᴇɴᴠᴇɴɪᴅᴀ ᴀʜ sɪᴅᴏ\n\n> ${current.enabled ? '🟢 ᴀᴄᴛɪᴠᴀᴅᴀ ' : '🔴  ᴅᴇsᴀᴄᴛɪᴠᴀᴅᴀ'}`
      });


    } catch (err) {
      console.error('[BIENVENIDA ERROR]', err);
      await sock.sendMessage(message.key.remoteJid, { text: '❌ Error al cambiar el estado.' });
    }
  },
};
