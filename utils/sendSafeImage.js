const fs = require('fs');

module.exports = async function sendSafeImage(
  sock,
  jid,
  imagePath,
  caption,
  mentions = []
) {
  // Fallback seguro (texto)
  const sendTextFallback = async () => {
    try {
      await sock.sendMessage(jid, {
        text: caption || '',
        mentions
      });
    } catch {
      // último nivel de seguridad: no romper el bot
    }
  };

  try {
    // Validaciones básicas
    if (!sock || !jid) {
      await sendTextFallback();
      return;
    }

    // Si no hay imagen o no existe → solo texto
    if (!imagePath || !fs.existsSync(imagePath)) {
      await sendTextFallback();
      return;
    }

    // Enviar imagen
    await sock.sendMessage(jid, {
      image: { url: imagePath },
      caption: caption || '',
      mentions
    });

  } catch (err) {
    console.error('[sendSafeImage error]', err);
    // ⚠️ En cualquier error → fallback a texto
    await sendTextFallback();
  }
};
