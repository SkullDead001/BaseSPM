const fs = require('fs');
const path = require('path');
const esAdmin = require('../../utils/admin');

module.exports = {
  name: 'despedida',
  alias: [],
  description: 'Activa o desactiva los mensajes de despedida (solo admins)',
  noCooldown: true,
  
  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith('@g.us')) return;

      // y Verificar si es admin
      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, { react: { text: '🚫', key: message.key } });
        return;
      }

      // 📂 Config
      const dir = path.join(__dirname, `../../data/config/${jid}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, `despedida.json`);
      let current = { enabled: true };

      if (fs.existsSync(filePath)) {
        current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }

      // 🔀 Alternar
      current.enabled = !current.enabled;
      fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf8');

      await sock.sendMessage(jid, {
        text: `✅ Exɪᴛᴏ ✅\n* Lᴀ ᴅᴇsᴘᴇᴅɪᴅᴀ ᴀʜ sɪᴅᴏ\n\n> ${current.enabled ? '🟢 ᴀᴄᴛɪᴠᴀᴅᴀ ' : '🔴  ᴅᴇsᴀᴄᴛɪᴠᴀᴅᴀ'}`
      });

    } catch (err) {
      console.error('[Despedida Error]', err);
      await sock.sendMessage(message.key.remoteJid, { text: '❌ Error al cambiar el estado de despedida.' });
    }
  }
};
