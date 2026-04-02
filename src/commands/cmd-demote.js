const fs = require('fs');
const esAdmin = require('../../utils/admin');
const images = require('../../utils/images');

// 🧩 Registro antispam global
const cooldowns = new Map();

module.exports = {
  name: 'demote',
  alias: ['quitaradmin', 'bajar'],
  description: 'Quita privilegios de administrador (solo admins)',
  noCooldown: true,
  
  exec: async ({ sock, message, state }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;
      if (!jid.endsWith('@g.us')) return;

      // 🚫 Antispam
      const key = `${jid}:${sender}:demote`;
      const now = Date.now();
      if (cooldowns.has(key) && now - cooldowns.get(key) < 5000) return;
      cooldowns.set(key, now);

      // 🔒 Asegurar variable global
      if (!global.manualAdminChange) global.manualAdminChange = new Set();

      // 🧩 Verificar si es admin
      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
        return;
      }

      // 🧩 Obtener usuario
      const user =
        message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
        message.message?.extendedTextMessage?.contextInfo?.participant;

      if (!user) {
        await sock.sendMessage(jid, {
          text: '⚠️ Menciona o responde a alguien para degradarlo.',
        });
        return;
      }

      if (user === sock.user.id) return;

      // 🚫 Marcar cambio manual
      global.manualAdminChange.add(jid);

      // ⚙️ Aplicar degradación
      await sock.groupParticipantsUpdate(jid, [user], 'demote');

      // 🕒 Quitar marca tras 5 segundos
      setTimeout(() => global.manualAdminChange.delete(jid), 5000);

      // 📢 Confirmación visual
      const caption = `> ✅ *Aᴅᴍɪɴɪꜱᴛʀᴀᴅᴏʀ Dᴇɢʀᴀᴅᴀᴅᴏ* 

* 👤 @${user.split('@')[0]}

> Aᴄᴄɪᴏ́ɴ ʀᴇᴀʟɪᴢᴀᴅᴀ ᴘᴏʀ
* 👤 @${sender.split('@')[0]}`;

      const imgPath = images.demote || images.config;

      if (imgPath && fs.existsSync(imgPath)) {
        await sock.sendMessage(jid, {
          image: { url: imgPath },
          caption,
          mentions: [sender, user],
        });
      } else {
        await sock.sendMessage(jid, { text: caption, mentions: [sender, user] });
      }
    } catch (err) {
      console.error('[DEMOTE COMMAND ERROR]', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Error al ejecutar el comando.',
      });
    }
  },
};
