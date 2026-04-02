const fs = require('fs');
const path = require('path');
const esAdmin = require('../../utils/admin');

const cooldowns = new Map(); // 🕒 Control de spam

module.exports = {
  name: 'compra',
  alias: [],
  description: 'Agrega una cantidad exacta de compras al usuario mencionado (solo admins)',
  noCooldown: true,


  exec: async ({ sock, message, args }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith('@g.us')) return;

      // 🕒 Evitar spam (2 segundos por grupo)
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

      // 🔹 Usuario mencionado
      const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      if (!mentioned || mentioned.length === 0) {
        await sock.sendMessage(jid, {
          text: `* ✳️ *Mᴇɴᴄɪᴏɴᴀ ᴏ ʀᴇsᴘᴏɴᴅᴇ ᴀ ᴜɴ ᴜsᴜᴀʀɪᴏ*

> Pᴀʀᴀ ʀᴇɢɪsᴛʀᴀʀ ᴄᴏᴍᴘʀᴀs ᴅᴇʙᴇs ᴍᴇɴᴄɪᴏɴᴀʀʟᴏ.`
        });
        return;
      }
      const userJid = mentioned[0];

      // 🔹 Validar cantidad
      const cantidad = parseInt(args[1]);
      if (isNaN(cantidad) || cantidad < 1) {
        await sock.sendMessage(jid, {
          text: `* ⚠️ *Cᴀɴᴛɪᴅᴀᴅ ɪɴᴠᴀ́ʟɪᴅᴀ*

> Usᴀ ᴜɴ ɴᴜ́ᴍᴇʀᴏ ᴠᴀ́ʟɪᴅᴏ ᴅᴇ ᴄᴏᴍᴘʀᴀs (ᴍɪ́nɪᴍᴏ 1).`
        });
        return;
      }

      // 🔹 Carpeta del grupo
      const dir = path.join(__dirname, `../../data/registros/${jid}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, `${userJid}.json`);
      let data = {};

      if (fs.existsSync(filePath)) {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }

      // 🔹 Sumar compras
      data.compras = (data.compras || 0) + cantidad;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

      // ✅ Confirmación FINAL (SIN auto-eliminación)
      await sock.sendMessage(jid, {
        text: `* ✅ *Rᴇɢɪsᴛʀᴏ ᴅᴇ ᴄᴏᴍᴘʀᴀs ᴇxɪᴛᴏsᴏ* ✅

* 📦 Cᴏᴍᴘʀᴀs ᴀɢʀᴇɢᴀᴅᴀs
> ${cantidad}

* 👤 Usᴜᴀʀɪᴏ: 
> @${userJid.split('@')[0]}
`
        ,
        mentions: [userJid]
      });

    } catch (err) {
      console.error('Error en comando compra:', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Oᴄᴜʀʀɪᴏ́ ᴜɴ ᴇʀʀᴏʀ ᴀʟ ʀᴇɢɪsᴛʀᴀʀ ʟᴀs ᴄᴏᴍᴘʀᴀs.'
      });
    }
  }
};
