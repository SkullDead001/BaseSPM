const fs = require('fs');
const path = require('path');
const esAdmin = require('../../utils/admin');
const images = require('../../utils/images.js');

// 🧩 Antispam
const cooldowns = new Map();

module.exports = {
  name: 'mdoadmin',
  alias: ['modoadmin'],
  description: 'Activa o desactiva el modo admin (solo admins)',
  noCooldown: true,

  exec: async ({ sock, message, args }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;
      if (!jid.endsWith('@g.us')) return;

      // 🚫 Antispam
      const key = `${jid}:${sender}:mdoadmin`;
      const now = Date.now();
      if (cooldowns.has(key) && now - cooldowns.get(key) < 5000) return;
      cooldowns.set(key, now);

      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, {
          react: { text: '⚠️', key: message.key }
        });
        return;
      }

      const estado = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(estado)) {
        const textoUso =
`❌ Uso correcto:

.mdoadmin on
.mdoadmin off`;
        await sock.sendMessage(jid, { text: textoUso });
        return;
      }

      const dir = path.join(__dirname, '../../data/adminmode');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, `${jid}.txt`),
        estado === 'on' ? 'true' : 'false'
      );

      const texto =
`* ✅ Cᴀᴍʙɪᴏs ʀᴇᴀʟɪᴢᴀᴅᴏs ✅


> Mᴏᴅᴏ Aᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ${estado === 'on' ? 'ACTIVADO' : 'DESACTIVADO'}

* *Sᴏʟᴏ ᴀᴅᴍɪɴ ᴏᴘᴇʀᴀɴ ʟᴏs ᴄᴏᴍᴀɴᴅᴏs*`;

      const imgPath = images.admin;
      if (imgPath && fs.existsSync(imgPath)) {
        await sock.sendMessage(jid, {
          image: { url: imgPath },
          caption: texto
        });
      } else {
        await sock.sendMessage(jid, { text: texto });
      }

    } catch (err) {
      console.error('[MDOADMIN ERROR]', err);
      await sock.sendMessage(
        message.key.remoteJid,
        { text: '❌ Error en modo admin.' }
      );
    }
  },
};
