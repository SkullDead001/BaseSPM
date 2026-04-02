// src/commands/resetlink.js
const fs = require('fs');
const esAdmin = require('../../utils/admin');
const images = require('../../utils/images.js');

module.exports = {
  name: 'resetlink',
  alias: [],
  desc: 'Restablece el enlace de invitación del grupo (solo admins)',
  noCooldown: true,

  
  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;

      if (!jid.endsWith('@g.us')) return; // Solo grupos

      // 🔒 Verificar admins
      const groupMeta = await sock.groupMetadata(jid);
      const admins = groupMeta.participants
        .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
        .map(p => p.id);

      if (!admins.includes(sender) && !message.key.fromMe) {
        await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
        return;
      }

      try {
        // ♻️ Revocar enlace anterior y generar nuevo
        await sock.groupRevokeInvite(jid);
        const newInviteCode = await sock.groupInviteCode(jid);
        const newLink = `https://chat.whatsapp.com/${newInviteCode}`;

        // 🧾 Texto de confirmación
        const texto = `📌 Exɪᴛᴏ 📌\n\n> Eɴʟᴀᴄᴇ ɴᴜᴇᴠᴏ ᴅᴇʟ ɢʀᴜᴘᴏ\n_${newLink}_`;

        // 🖼️ Ruta de imagen
        const imgPath = images.resetlink;

        // ⚙️ Enviar con imagen si existe, o solo texto si no
        if (imgPath && fs.existsSync(imgPath)) {
          await sock.sendMessage(jid, {
            image: { url: imgPath },
            caption: texto,
          });
        } else {
          await sock.sendMessage(jid, { text: texto });
        }

      } catch (err) {
        console.error('[RESETLINK - ERROR AL RESTABLECER]', err);
        await sock.sendMessage(jid, {
          text: '❌ No se pudo restablecer el enlace del grupo. Asegúrate de que el bot sea admin.',
        });
      }

    } catch (err) {
      console.error('[RESETLINK COMMAND ERROR]', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Ocurrió un error al ejecutar el comando.',
      });
    }
  },
};
