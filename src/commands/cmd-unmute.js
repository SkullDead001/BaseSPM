const fs = require('fs');
const { removeMute, getMuted } = require('../../utils/mute.js');
const images = require('../../utils/images.js');

// 🧩 Registro antispam
const cooldowns = new Map();

module.exports = {
  name: 'unmute',
  alias: ['desmutear', 'activarvoz'],
  desc: 'Quita la restricción de mute a un usuario (solo admins)',
  noCooldown: true,

  async exec({ sock, message }) {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || message.key.remoteJid;
      if (!jid.endsWith('@g.us')) return;

      // 🚫 Antispam
      const key = `${jid}:${sender}:unmute`;
      const now = Date.now();
      if (cooldowns.has(key) && now - cooldowns.get(key) < 5000) return;
      cooldowns.set(key, now);

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

      const quoted = message.message?.extendedTextMessage?.contextInfo;
      const mentioned = quoted?.mentionedJid?.[0] || quoted?.participant;
      if (!mentioned) {
        const textoUso =
`❌ Uso correcto:

Responde o menciona al usuario
que quieres desmutear.`;
        await sock.sendMessage(jid, { text: textoUso });
        return;
      }

      const mutedUsers = getMuted(jid);
      if (!mutedUsers.includes(mentioned.toLowerCase())) {
        const textoNoMute =
`> ⚠️ Aᴠɪsᴏ ⚠️

* Lᴀ ᴘᴇʀsᴏɴᴀ
> @${mentioned.split('@')[0]}

* Nᴏ ᴛɪᴇɴᴇ ᴍᴜᴛᴇ`;
        await sock.sendMessage(jid, {
          text: textoNoMute,
          mentions: [mentioned],
        });
        return;
      }

      removeMute(jid, mentioned);

      const texto =
`> ✅ Aᴄᴄɪᴏɴ ʀᴇᴀʟɪᴢᴀᴅᴀ ✅

Usᴜᴀʀɪᴏ ᴅᴇsᴍᴜᴛᴇᴀᴅᴏ
> @${mentioned.split('@')[0]}


* Yᴀ ᴘᴜᴇᴅᴇs ᴄᴏɴᴠᴇʀsᴀʀ`;

      const imgPath = images.unmute;
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
      console.error('[UNMUTE ERROR]', err);
      await sock.sendMessage(
        message.key.remoteJid,
        { text: '❌ Error al ejecutar el comando.' }
      );
    }
  },
};
