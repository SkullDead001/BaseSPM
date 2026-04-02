// ======================================================
// 🗯️ Comando: .qc | .quote (SupremTX PRO)
// Genera un sticker con tu texto y avatar de perfil
// ======================================================

const axios = require('axios');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

// Cooldown por usuario (no por grupo)
const cooldowns = new Map();
const COOLDOWN_MS = 2000;

module.exports = {
  name: 'qc',
  alias: ['quote'],
  description: 'Crea un sticker tipo "quote" con tu texto y foto de perfil.',
  noCooldown: true,


  exec: async ({ sock, message }) => {
    const jid = message?.key?.remoteJid;
    const sender = message?.key?.participant || jid;

    if (!jid || !sender) return;

    // 🕒 Cooldown (por usuario)
    const now = Date.now();
    const last = cooldowns.get(sender);

    if (last && now - last < COOLDOWN_MS) {
      await sock.sendMessage(jid, {
        react: { text: '⏳', key: message.key }
      });
      return;
    }

    cooldowns.set(sender, now);
    setTimeout(() => cooldowns.delete(sender), COOLDOWN_MS);

    try {
      // 📝 Texto directo o citado
      const quoted =
        message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      const rawText =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        '';

      const cleanedText = rawText.replace(/^(\.qc|\.quote)\s*/i, '').trim();

      const quotedText =
        quoted?.conversation ||
        quoted?.extendedTextMessage?.text ||
        '';

      const text = cleanedText || quotedText;

      // ⚠️ Validaciones (idénticas en salida)
      if (!text) {
        await sock.sendMessage(
          jid,
          { text: '⚠️ Debes escribir un texto o responder a un mensaje.' },
          { quoted: message }
        );
        return;
      }

      if (text.length > 100) {
        await sock.sendMessage(
          jid,
          { text: '❌ El texto no puede exceder 100 caracteres.' },
          { quoted: message }
        );
        return;
      }

      await sock.sendMessage(jid, {
        react: { text: '📜', key: message.key }
      });

      // 🖼️ Foto de perfil (con timeout seguro)
      let ppUrl;
      try {
        ppUrl = await Promise.race([
          sock.profilePictureUrl(sender, 'image'),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 4000)
          )
        ]);
      } catch {
        ppUrl = 'https://telegra.ph/file/a2ae6cbfa40f6eeea0cf1.jpg';
      }

      // 🎨 Payload API
      const payload = {
        type: 'quote',
        format: 'png',
        backgroundColor: '#000000',
        width: 512,
        height: 768,
        scale: 2,
        messages: [
          {
            entities: [],
            avatar: true,
            from: {
              id: 1,
              name: message.pushName || 'Usuario',
              photo: { url: ppUrl },
            },
            text,
            replyMessage: {},
          },
        ],
      };

      // 🌐 API principal + fallback
      let data;
      try {
        const res = await axios.post(
          'https://bot.lyo.su/quote/generate',
          payload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
          }
        );
        data = res.data;
      } catch {
        const fallback = await axios.post(
          'https://api.ryzendesu.com/api/qc',
          payload,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
          }
        );
        data = fallback.data;
      }

      if (!data?.result?.image) {
        throw new Error('Sin imagen en la respuesta.');
      }

      const imgBuffer = Buffer.from(data.result.image, 'base64');

      // 🧩 Crear sticker
      const sticker = new Sticker(imgBuffer, {
        pack: '࣪BᴏʙMᴀʀʟᴇʏ☽ Bᴏᴛ',
        author: 'ʙᴏᴛ-ᴛx | ᴅᴇᴠ-Sᴜᴘʀᴇᴍ ',
        type: StickerTypes.FULL,
        quality: 80,
      });

      const stickerBuffer = await sticker.build();

      // 📤 Envío final
      await sock.sendMessage(
        jid,
        { sticker: stickerBuffer },
        { quoted: message }
      );

      await sock.sendMessage(jid, {
        react: { text: '✅', key: message.key }
      });

    } catch (err) {
      console.error('[QC ERROR]', err);

      await sock.sendMessage(jid, {
        react: { text: '❌', key: message.key }
      });

      await sock.sendMessage(
        jid,
        { text: '❌ Error al crear el sticker de quote. Intenta nuevamente.' },
        { quoted: message }
      );
    }
  },
};
