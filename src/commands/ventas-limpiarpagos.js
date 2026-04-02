const fs = require('fs');
const path = require('path');
const esAdmin = require('../../utils/admin');

const cooldowns = new Map(); // 🕒 Control de spam (2 segundos)

module.exports = {
  name: 'limpiarpagos',
  alias: ['clearreg', 'limpiar'],
  description: 'Limpia todos los registros de pagos del grupo (solo admins)',
  noCooldown: true,


  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith('@g.us')) return; // Solo grupos

      // 🕒 Cooldown de 2 segundos por grupo
      const now = Date.now();
      if (cooldowns.has(jid) && now - cooldowns.get(jid) < 2000) {
        await sock.sendMessage(jid, {
          react: { text: '⏳', key: message.key }
        });
        return;
      }
      cooldowns.set(jid, now);

      // 🔹 Verificar si es admin
      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, {
          react: { text: '⚠️', key: message.key }
        });
        return;
      }

      // 📂 Ruta del archivo de registros
      const dir = path.join(__dirname, `../../data/registros/${jid}`);
      const filePath = path.join(dir, 'registro.json');

      // 📄 Validar si existe
      if (!fs.existsSync(filePath)) {
        await sock.sendMessage(jid, {
          text: `* 📂 *Nᴏ ʜᴀʏ ʀᴇɢɪsᴛʀᴏs*

> Eʟ ɢʀᴜᴘᴏ ɴᴏ ᴄᴜᴇɴᴛᴀ ᴄᴏɴ ʀᴇɢɪsᴛʀᴏs ᴅᴇ ᴘᴀɢᴏs.`
        });
        return;
      }

      // 🧹 Limpiar el contenido (vaciar el JSON)
      fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf8');

      // ✅ Confirmación FINAL (SIN auto-eliminación)
      await sock.sendMessage(jid, {
        text: `* ✅ *Rᴇɢɪsᴛʀᴏs ᴅᴇ ᴘᴀɢᴏs ʟɪᴍᴘɪᴀᴅᴏs* ✅

> ✔️ Eʟ ʜɪsᴛᴏʀɪᴀʟ ᴅᴇ ᴘᴀɢᴏs ғᴜᴇ ʙᴏʀʀᴀᴅᴏ ᴄᴏʀʀᴇᴄᴛᴀᴍᴇɴᴛᴇ.`
      });

    } catch (err) {
      console.error('Error en comando limpiarpagos:', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Oᴄᴜʀʀɪᴏ́ ᴜɴ ᴇʀʀᴏʀ ᴀʟ ʟɪᴍᴘɪᴀʀ ʟᴏs ʀᴇɢɪsᴛʀᴏs ᴅᴇ ᴘᴀɢᴏs.'
      });
    }
  }
};
