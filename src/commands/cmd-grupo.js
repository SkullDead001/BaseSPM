const fs = require('fs');
const esAdmin = require('../../utils/admin');
const images = require('../../utils/images');

// 🧩 Registro antispam global
const cooldowns = new Map();

module.exports = {
  name: 'grupo',
  alias: ['g'],
  description: 'Abre o cierra el chat del grupo (solo admins)',
  noCooldown: true,

  exec: async ({ sock, message, args }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;
      if (!jid.endsWith('@g.us')) return;

      // 🚫 Antispam
      const key = `${jid}:${sender}:grupo`;
      const now = Date.now();
      if (cooldowns.has(key) && now - cooldowns.get(key) < 5000) return;
      cooldowns.set(key, now);

      // 🧩 Verificar admin
      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, {
          react: { text: '⚠️', key: message.key }
        });
        return;
      }

      // 📜 Validar acción
      const accion = args[0]?.toLowerCase();
      if (!accion || !['abrir', 'cerrar'].includes(accion)) {
        await sock.sendMessage(jid, {
          text: `⚠️ *Usᴏ ᴄᴏʀʀᴇᴄᴛᴏ*

> .grupo abrir
> .grupo cerrar`
        });
        return;
      }

      // ✅ Registro global de cambios manuales
      if (!global.manualGroupChange) global.manualGroupChange = new Set();
      global.manualGroupChange.add(jid);

      // 🧩 Aplicar configuración
      await sock.groupSettingUpdate(
        jid,
        accion === 'cerrar' ? 'announcement' : 'not_announcement'
      );

      // 🕒 Limpieza de marca
      setTimeout(() => global.manualGroupChange.delete(jid), 5000);

      // 🖼️ Mensaje final
      const texto =
        accion === 'cerrar'
          ? `* *Cᴏᴍᴀɴᴅᴏ ᴇᴊᴇᴄᴜᴛᴀᴅᴏ*

> 🔒 *Gʀᴜᴘᴏ ᴄᴇʀʀᴀᴅᴏ ᴄᴏɴ ᴇxɪᴛᴏ*
* ✅ Cᴀᴍʙɪᴏ ᴀᴘʟɪᴄᴀᴅᴏ
`
          : `* *Cᴏᴍᴀɴᴅᴏ ᴇᴊᴇᴄᴜᴛᴀᴅᴏ*

> 🔓 *Gʀᴜᴘᴏ ᴀʙɪᴇʀᴛᴏ ᴄᴏɴ ᴇxɪᴛᴏ*
* ✅ Cᴀᴍʙɪᴏ ᴀᴘʟɪᴄᴀᴅᴏ
`;

      const imgPath = images.admin;
      if (imgPath && fs.existsSync(imgPath)) {
        await sock.sendMessage(jid, {
          image: { url: imgPath },
          caption: texto.trim()
        });
      } else {
        await sock.sendMessage(jid, { text: texto.trim() });
      }

    } catch (err) {
      console.error('[GRUPO COMMAND ERROR]', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ *Oᴄᴜʀʀɪᴏ́ ᴜɴ ᴇʀʀᴏʀ ᴀʟ ᴇᴊᴇᴄᴜᴛᴀʀ ᴇʟ ᴄᴏᴍᴀɴᴅᴏ.*'
      });
    }
  },
};
