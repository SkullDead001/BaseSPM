const esAdmin = require('../../utils/admin');
const images = require('../../utils/images');

// 🧩 Registro antispam global
const cooldowns = new Map();

module.exports = {
  name: 'link',
  alias: [],
  description: 'Muestra el enlace del grupo (solo admins)',
  noCooldown: true,

  
  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;
      if (!jid.endsWith('@g.us')) return;

      // 🚫 Antispam
      const key = `${jid}:${sender}:link`;
      const now = Date.now();
      if (cooldowns.has(key) && now - cooldowns.get(key) < 5000) return;
      cooldowns.set(key, now);

      // Verificar admin
      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
        return;
      }

      const groupMetadata = await sock.groupMetadata(jid);

      let link;
      try {
        const inviteCode = await sock.groupInviteCode(jid);
        link = `https://chat.whatsapp.com/${inviteCode}`;
      } catch {
        link = `https://chat.whatsapp.com/${groupMetadata.id.split('@')[0]}`;
      }

      const imgPath = images.admin;
      if (imgPath) {
        await sock.sendMessage(jid, {
          image: { url: imgPath },
          caption: `${link}`,
        });
      } else {
        await sock.sendMessage(jid, { text: `${link}` });
      }
    } catch (err) {
      console.error('[LINK ERROR]', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Error al obtener el enlace del grupo.',
      });
    }
  },
};
