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

      // 🕒 Evitar spam (2 seg por grupo)
      const now = Date.now();
      if (cooldowns.has(jid) && now - cooldowns.get(jid) < 2000) {
        await sock.sendMessage(jid, { react: { text: '⏳', key: message.key } });
        return;
      }
      cooldowns.set(jid, now);

      // 🔐 Verificar admin
      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
        return;
      }

      // 👤 Usuario mencionado
      const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      if (!mentioned || mentioned.length === 0) {
        return sock.sendMessage(jid, {
          text: `
* ⚠️ *Uꜱᴏ ɪɴᴄᴏʀʀᴇᴄᴛᴏ*

> Mᴇɴᴄɪᴏɴᴀ ᴏ ʀᴇsᴘᴏɴᴅᴇ ᴀ ᴜɴ ᴜsᴜᴀʀɪᴏ ᴘᴀʀᴀ ʀᴇɢɪsᴛʀᴀʀ sᴜs ᴄᴏᴍᴘʀᴀs.

* Eᴊᴇᴍᴘʟᴏ:
> .compra @usuario 3
          `.trim()
        });
      }

      const userJid = mentioned[0];

      // 🔢 Validar cantidad
      const cantidad = parseInt(args[1]);
      if (isNaN(cantidad) || cantidad < 1) {
        return sock.sendMessage(jid, {
          text: `
* ⚠️ *Cᴀɴᴛɪᴅᴀᴅ ɴᴏ ᴠᴀ́ʟɪᴅᴀ*

> Dᴇʙᴇs ɪɴɢʀᴇsᴀʀ ᴜɴ ɴᴜ́ᴍᴇʀᴏ ᴍᴀʏᴏʀ ᴏ ɪɢᴜᴀʟ ᴀ 1.

* Eᴊᴇᴍᴘʟᴏ:
> .compra @usuario 2
          `.trim()
        });
      }

      // 📁 Carpeta del grupo
      const dir = path.join(__dirname, `../../data/registros/${jid}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, `${userJid}.json`);
      let data = {};

      if (fs.existsSync(filePath)) {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }

      // ➕ Sumar compras
      data.compras = (data.compras || 0) + cantidad;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

      // ✅ Confirmación visual (SIN auto-delete)
      await sock.sendMessage(jid, {
        text: `
 > ✅ Rᴇɢɪsᴛʀᴏ Cᴏᴍᴘʟᴇᴛᴀᴅᴏ ✅

* 👤 Uꜱᴜᴀʀɪᴏ:*
> @${userJid.split('@')[0]}

* ➕ Cᴏᴍᴘʀᴀs Aɢʀᴇɢᴀᴅᴀs:*
> ${cantidad}
`.trim(),
        mentions: [userJid]
      });

    } catch (err) {
      console.error('Error en comando compra:', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: `
❌ *Eʀʀᴏʀ Iɴᴇsᴘᴇʀᴀᴅᴏ*

Nᴏ sᴇ ᴘᴜᴅᴏ ʀᴇɢɪsᴛʀᴀʀ ʟᴀ ᴄᴏᴍᴘʀᴀ.
Iɴᴛᴇɴᴛᴀ ɴᴜᴇᴠᴀᴍᴇɴᴛᴇ.
        `.trim()
      });
    }
  }
};
