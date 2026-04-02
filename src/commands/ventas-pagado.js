const fs = require('fs');
const path = require('path');
const esAdmin = require('../../utils/admin');

const cooldowns = new Map(); // 🕒 Control de spam (2 s por grupo)

module.exports = {
  name: 'pagado',
  alias: [],
  description: 'Aumenta en 1 el número de compras de un usuario mencionado o respondido (solo admins)',
  noCooldown: true,


  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith('@g.us')) return; // Solo grupos

      // 🕒 Cooldown (2 segundos)
      const now = Date.now();
      if (cooldowns.has(jid) && now - cooldowns.get(jid) < 2000) {
        await sock.sendMessage(jid, {
          react: { text: '⏳', key: message.key }
        });
        return;
      }
      cooldowns.set(jid, now);

      // 🔹 Verificar admin
      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, {
          react: { text: '⚠️', key: message.key }
        });
        return;
      }

      // 👤 Usuario mencionado o respondido
      const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      const replied = message.message?.extendedTextMessage?.contextInfo?.participant;
      const userJid = mentioned?.[0] || replied;

      if (!userJid) {
        await sock.sendMessage(jid, {
          text: '✳️ Mᴇɴᴄɪᴏɴᴀ ᴏ ʀᴇsᴘᴏɴᴅᴇ ᴀʟ ᴜsᴜᴀʀɪᴏ ᴀ ʀᴇɢɪsᴛʀᴀʀ.'
        });
        return;
      }

      // 📂 Directorio del grupo
      const dir = path.join(__dirname, `../../data/registros/${jid}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, 'registro.json');
      let data = {};
      if (fs.existsSync(filePath)) {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }

      // ➕ Sumar compra
      data[userJid] = (data[userJid] || 0) + 1;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

      // ✅ Confirmación FINAL (SIN auto-eliminación)
      await sock.sendMessage(jid, {
        text: `📌 *Rᴇɢɪsᴛʀᴏ ᴅᴇ ᴘᴀɢᴏ ᴄᴏɴғɪʀᴍᴀᴅᴏ* 📌

👤 Uꜱᴜᴀʀɪᴏ
@${userJid.split('@')[0]}

📦 Cᴏᴍᴘʀᴀs ʀᴇɢɪsᴛʀᴀᴅᴀs
${data[userJid]}

✔️ Eʟ ᴘᴀɢᴏ ғᴜᴇ ᴀɢʀᴇɢᴀᴅᴏ ᴄᴏʀʀᴇᴄᴛᴀᴍᴇɴᴛᴇ.`,
        mentions: [userJid]
      });

    } catch (err) {
      console.error('Error en comando pagado:', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Oᴄᴜʀʀɪᴏ́ ᴜɴ ᴇʀʀᴏʀ ᴀʟ ʀᴇɢɪsᴛʀᴀʀ ᴇʟ ᴘᴀɢᴏ.'
      });
    }
  }
};
