const fs = require('fs');
const path = require('path');
const esAdmin = require('../../utils/admin');

const cooldowns = new Map(); // 🕒 Control global de 2s por grupo

module.exports = {
  name: 'registro',
  alias: [],
  description: 'Muestra todos los registros de compras del grupo en ranking (solo admins)',
  noCooldown: true,


  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith('@g.us')) return;

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

      // 📂 Archivo del grupo
      const dir = path.join(__dirname, `../../data/registros/${jid}`);
      const filePath = path.join(dir, 'registro.json');

      // 📁 Validar existencia
      if (!fs.existsSync(filePath)) {
        await sock.sendMessage(jid, {
          text: `⚠️ *Nᴏ ʜᴀʏ ʀᴇɢɪsᴛʀᴏs ᴀᴜ́ɴ*

Usᴀ:
.pagado @usuario

Pᴀʀᴀ ɪɴɪᴄɪᴀʀ ᴇʟ ᴄᴏɴᴛᴇᴏ.`
        });
        return;
      }

      // 📜 Leer datos
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Object.keys(data).length === 0) {
        await sock.sendMessage(jid, {
          text: '⚠️ *Aᴜ́ɴ ɴᴏ ʜᴀʏ ʀᴇɢɪsᴛʀᴏs ɢᴜᴀʀᴅᴀᴅᴏs ᴇɴ ᴇsᴛᴇ ɢʀᴜᴘᴏ.*'
        });
        return;
      }

      // 🏆 Ordenar ranking
      const ranking = Object.entries(data).sort((a, b) => b[1] - a[1]);
      const mentions = [];

      let texto = `* 🏆 *Rᴀɴᴋɪɴɢ ᴅᴇ ᴄᴏᴍᴘʀᴀs*

* 👥 Uꜱᴜᴀʀɪᴏs ʀᴇɢɪsᴛʀᴀᴅᴏs
> ${ranking.length}

`;

      ranking.forEach(([userJid, compras], index) => {
        const pos = index + 1;
        let icono = '🔹';
        if (pos === 1) icono = '🥇';
        else if (pos === 2) icono = '🥈';
        else if (pos === 3) icono = '🥉';

        texto += `

${icono} ${pos}. @${userJid.split('@')[0]}
* 📦 Cᴏᴍᴘʀᴀs
> ${compras}`;
        mentions.push(userJid);
      });

      // ✅ Enviar ranking (SIN auto-eliminación)
      await sock.sendMessage(jid, {
        text: texto.trim(),
        mentions
      });

    } catch (err) {
      console.error('Error en comando registro:', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Oᴄᴜʀʀɪᴏ́ ᴜɴ ᴇʀʀᴏʀ ᴀʟ ᴍᴏsᴛʀᴀʀ ᴇʟ ʀᴇɢɪsᴛʀᴏ.'
      });
    }
  }
};
