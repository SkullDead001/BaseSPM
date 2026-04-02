// ======================================================
// 🎨 Comando: .sticker | .s | .stik | .st (SupremTX PRO)
// ======================================================
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

// 🕒 Control de uso (Anti-spam global)
const cooldowns = new Map();

module.exports = {
  name: 'sticker',
  alias: ['s', 'stik', 'st'],
  description: 'Convierte imagen, video o GIF en sticker animado con metadata.',
  noCooldown: true,


  exec: async ({ sock, message }) => {
    const jid = message.key.remoteJid;
    const sender = message.key.participant || jid;

    // 🔒 Cooldown (2 s)
    const key = `${jid}:${sender}`;
    const now = Date.now();
    if (cooldowns.has(key) && now - cooldowns.get(key) < 2000) {
      await sock.sendMessage(jid, { react: { text: '⏳', key: message.key } });
      return;
    }
    cooldowns.set(key, now);

    try {
      // 📦 Obtener mensaje real (vista única incluida)
      const quoted =
        message.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
        message.message;
      const actual =
        quoted?.viewOnceMessage?.message || quoted;

      // 🖼️ Detectar tipo de media
      const mediaType = actual.imageMessage
        ? 'image'
        : actual.videoMessage
          ? 'video'
          : actual.stickerMessage
            ? 'sticker'
            : null;

      if (!mediaType) {
        await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
        await sock.sendMessage(
          jid,
          { text: '⚠️ Debes responder a una imagen, video o sticker.' },
          { quoted: message }
        );
        return;
      }

      // 📥 Descargar contenido
      const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, {});

      // Si ya es sticker → reenviar directamente
      if (mediaType === 'sticker') {
        await sock.sendMessage(jid, { sticker: buffer }, { quoted: message });
        return;
      }

      // 🏷️ Metadata del sticker
      const pack = '࣪BᴏʙMᴀʀʟᴇʏ☽ Bᴏᴛ\n';
      const author = 'ʙᴏᴛ-ᴛx | ᴅᴇᴠ-Sᴜᴘʀᴇᴍ';
      let sticker;

      // 🖼️ Imagen → Sticker estático
      if (mediaType === 'image') {
        sticker = new Sticker(buffer, {
          pack,
          author,
          type: StickerTypes.FULL,
          quality: 80,
        });
      }

      // 🎞️ Video → Sticker animado
      else if (mediaType === 'video') {
        const duration = actual.videoMessage?.seconds || 0;
        if (duration > 10) {
          await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
          await sock.sendMessage(
            jid,
            { text: '⚠️ El video no puede durar más de *10 segundos*.' },
            { quoted: message }
          );
          return;
        }

        sticker = new Sticker(buffer, {
          pack,
          author,
          type: StickerTypes.FULL_VIDEO,
          quality: 80,
          animated: true,
        });
      }

      // 🧩 Enviar sticker final
      const stickerBuffer = await sticker.build();
      await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: message });
      await sock.sendMessage(jid, { react: { text: '✅', key: message.key } });

    } catch (err) {
      console.error('[STICKER ERROR]', err);
      await sock.sendMessage(jid, { react: { text: '❌', key: message.key } });
      await sock.sendMessage(
        jid,
        { text: '❌ Error al crear el sticker.\nAsegúrate de que el archivo sea válido.' },
        { quoted: message }
      );
    }
  }
};
