const fs = require('fs');
const path = require('path');
const esAdmin = require('../../utils/admin');

const cooldowns = new Map(); // 🕒 Control global (2 segundos)

module.exports = {
  name: 'tops',
  alias: [],
  description: 'Muestra el ranking de compras en el grupo (solo admins)',
  noCooldown: true,


  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith('@g.us')) return;

      // 🕒 Cooldown (2 s por grupo)
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

      // 📂 Carpeta del grupo
      const dir = path.join(__dirname, `../../data/registros/${jid}`);
      if (!fs.existsSync(dir)) {
        await sock.sendMessage(jid, {
          text: `> ⚠️ *Nᴏ ʜᴀʏ ʀᴇɢɪsᴛʀᴏs ᴀᴜ́ɴ*

* Usᴀ:
> .compra @usuario 150

Pᴀʀᴀ ɪɴɪᴄɪᴀʀ ᴇʟ ᴄᴏɴᴛᴇᴏ.`
        });
        return;
      }

      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      if (files.length === 0) {
        await sock.sendMessage(jid, {
          text: `> ⚠️ *Aᴜ́ɴ ɴᴏ ʜᴀʏ ʀᴇɢɪsᴛʀᴏs ᴅᴇ ᴄᴏᴍᴘʀᴀs*

* Usᴀ:
> .compra @usuario 150

Pᴀʀᴀ ᴄᴏᴍᴇɴᴢᴀʀ.`
        });
        return;
      }

      // 📊 Crear ranking
      const ranking = files
        .map(file => {
          const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
          return {
            user: file.replace('.json', ''),
            compras: data.compras || 0
          };
        })
        .sort((a, b) => b.compras - a.compras);

      if (ranking.length === 0) {
        await sock.sendMessage(jid, {
          text: '> ⚠️ *Nᴏ ʜᴀʏ ᴅᴀᴛᴏs ᴠᴀ́ʟɪᴅᴏs ᴅᴇ ᴄᴏᴍᴘʀᴀs.*'
        });
        return;
      }

      // 🏆 Texto del ranking
      let texto = `> 🏆 *Rᴀɴᴋɪɴɢ ᴅᴇ ᴄᴏᴍᴘʀᴀs*

* 👥 Uꜱᴜᴀʀɪᴏs ʀᴇɢɪsᴛʀᴀᴅᴏs*
> ${ranking.length}
`;
      const mentions = [];

      ranking.forEach((r, index) => {
        let medal = '🔹';
        if (index === 0) medal = '🥇';
        else if (index === 1) medal = '🥈';
        else if (index === 2) medal = '🥉';

        texto += `

${medal} ${index + 1}. @${r.user.split('@')[0]}
* 📦 Cᴏᴍᴘʀᴀs*
> ${r.compras}`;
        mentions.push(r.user);
      });


      // ✅ Enviar ranking (sin auto-eliminación)
      await sock.sendMessage(jid, {
        text: texto.trim(),
        mentions
      });

    } catch (err) {
      console.error('Error en comando tops:', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Oᴄᴜʀʀɪᴏ́ ᴜɴ ᴇʀʀᴏʀ ᴀʟ ᴍᴏsᴛʀᴀʀ ᴇʟ ʀᴀɴᴋɪɴɢ.'
      });
    }
  }
};
