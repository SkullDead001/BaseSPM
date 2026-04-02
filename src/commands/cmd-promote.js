const fs = require('fs');
const esAdmin = require('../../utils/admin');
const images = require('../../utils/images.js');

// 🧩 Registro antispam global
const cooldowns = new Map();

module.exports = {
  name: 'promote',
  alias: ['daradmin', 'subir'],
  description: 'Otorga privilegios de administrador a un usuario (solo admins)',
  noCooldown: true,

  
  exec: async ({ sock, message, state }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;
      if (!jid.endsWith('@g.us')) return;

      /* ===================================================
         🧷 STICKER → COMANDO (integrado del códifgo 1)
      =================================================== */
      const st =
        message.message?.stickerMessage ||
        message.message?.ephemeralMessage?.message?.stickerMessage ||
        null;

      if (st) {
        const jsonPath = './comandos.json';
        if (!fs.existsSync(jsonPath)) fs.writeFileSync(jsonPath, '{}');

        const map = JSON.parse(fs.readFileSync(jsonPath, 'utf-8') || '{}');

        const rawSha = st.fileSha256 || st.fileSha256Hash || st.filehash;
        let stickerCmd = null;

        if (rawSha) {
          const sha =
            Buffer.isBuffer(rawSha)
              ? rawSha.toString('base64')
              : ArrayBuffer.isView(rawSha)
              ? Buffer.from(rawSha).toString('base64')
              : rawSha;

          if (map[sha] && map[sha].trim()) {
            stickerCmd = map[sha].trim();
          }
        }

        // ⚠️ Si el sticker NO es promote → salir
        if (stickerCmd !== 'promote') return;
      }

      /* ===================================================
         🚫 Antispam
      =================================================== */
      const key = `${jid}:${sender}:promote`;
      const now = Date.now();
      if (cooldowns.has(key) && now - cooldowns.get(key) < 5000) return;
      cooldowns.set(key, now);

      /* ===================================================
         🔒 Control admin
      =================================================== */
      if (!global.manualAdminChange) global.manualAdminChange = new Set();

      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, {
          react: { text: '⚠️', key: message.key },
        });
        return;
      }

      /* ===================================================
         👤 Usuario objetivo
      =================================================== */
      const user =
        message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
        message.message?.extendedTextMessage?.contextInfo?.participant;

      if (!user) {
        await sock.sendMessage(jid, {
          text: '⚠️ Menciona o responde a alguien para promoverlo.',
        });
        return;
      }

      if (user === sock.user.id) return;

      /* ===================================================
         ⚙️ Promoción
      =================================================== */
      global.manualAdminChange.add(jid);
      await sock.groupParticipantsUpdate(jid, [user], 'promote');
      setTimeout(() => global.manualAdminChange.delete(jid), 5000);

      /* ===================================================
         📢 Confirmación
      =================================================== */
      const texto = `> ✅ *Nᴜᴇᴠᴏ Aᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ*

👤 *@${user.split('@')[0]}*

> *ᴀᴄᴄɪóɴ ʀᴇᴀʟɪᴢᴀᴅᴀ ᴘᴏʀ*
👤 *@${sender.split('@')[0]}*
`;

      const imgPath = images.promote;
      if (imgPath && fs.existsSync(imgPath)) {
        await sock.sendMessage(jid, {
          image: { url: imgPath },
          caption: texto,
          mentions: [sender, user],
        });
      } else {
        await sock.sendMessage(jid, { text: texto, mentions: [sender, user] });
      }
    } catch (err) {
      console.error('[PROMOTE COMMAND ERROR]', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Error al ejecutar el comando.',
      });
    }
  },
};
