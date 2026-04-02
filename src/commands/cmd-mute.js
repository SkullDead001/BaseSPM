const fs = require('fs');
const { addMute } = require('../../utils/mute.js');
const images = require('../../utils/images.js');

// 🧩 Registro antispam
const cooldowns = new Map();

module.exports = {
  name: 'mute',
  alias: ['silenciar', 'callar'],
  description: 'Silencia a un usuario en el grupo (solo admins)',
  noCooldown: true,

  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;
      if (!jid.endsWith('@g.us')) return;

      const metadata = await sock.groupMetadata(jid);
      const isAdmin = metadata.participants.some(
        p => p.id === sender && ['admin', 'superadmin'].includes(p.admin)
      );
      if (!isAdmin) {
        await sock.sendMessage(jid, {
          react: { text: '⚠️', key: message.key }
        });
        return;
      }

      const q = message.message?.extendedTextMessage?.contextInfo;
      const mentioned = q?.mentionedJid?.[0] || q?.participant;
      if (!mentioned) {
        const textoUso =
`❌ Uso correcto:

Responde o menciona a un usuario
para silenciarlo.`;
        await sock.sendMessage(jid, { text: textoUso });
        return;
      }

      addMute(jid, mentioned);

      const texto =
`> ✅ Aᴄᴄɪᴏɴ ʀᴇᴀʟɪᴢᴀᴅᴀ ✅

* Usᴜᴀʀɪᴏ ᴍᴜᴛᴇᴀᴅᴏ 
> @${mentioned.split('@')[0]}

* Nᴏ ᴘᴏᴅʀᴀs sᴇɢᴜɪʀ ᴄᴏɴᴠᴇʀsᴀɴᴅᴏ`;
  
      const imgPath = images.admin;
      if (imgPath && fs.existsSync(imgPath)) {
        await sock.sendMessage(jid, {
          image: { url: imgPath },
          caption: texto,
          mentions: [mentioned],
        });
      } else {
        await sock.sendMessage(jid, {
          text: texto,
          mentions: [mentioned],
        });
      }

    } catch (err) {
      console.error('[MUTE ERROR]', err);
      await sock.sendMessage(
        message.key.remoteJid,
        { text: '⚠️ Error al silenciar.' }
      );
    }
  },
};
