// src/commands/lib-ai.js
const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

// 📂 Leer configuración desde src/api/apis.json
const apiConfigPath = path.join(__dirname, "..", "api", "apis.json");
let apiConfig = {};
try {
  if (fs.existsSync(apiConfigPath)) {
    const raw = fs.readFileSync(apiConfigPath, "utf8");
    apiConfig = JSON.parse(raw);
  } else {
    console.warn("⚠️ No se encontró src/api/apis.json.");
  }
} catch (err) {
  console.error("❌ Error leyendo apis.json:", err);
}

// 📁 Directorio de descargas
const downloadsDir = path.join(__dirname, "..", "..", "downloads");
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

// 🔹 Inicializar Claude
let anthropic = null;
if (apiConfig.claude) {
  anthropic = new Anthropic({ apiKey: apiConfig.claude });
}

// 🕒 Cooldown global
const cooldowns = new Map();

// 🔧 Descarga robusta
async function safeDownload(sock, wrapperMsg, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const buffer = await downloadMediaMessage(
        wrapperMsg,
        "buffer",
        {},
        { logger: sock.logger, reuploadRequest: sock.updateMediaMessage }
      );
      if (buffer && buffer.length > 50) return buffer;
    } catch (err) {
      console.warn(`⚠️ Descarga falló (${i + 1}/${retries}): ${err.message}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("❌ No se pudo descargar la imagen.");
}

module.exports = {
  name: "ai",
  alias: ["chatgpt", "simi"],
  description: "Chatea con IA (Claude)",
  noCooldown: true,

  exec: async ({ sock, message, args }) => {
    const jid = message.key.remoteJid;
    const sender = message.key.participant || message.key.remoteJid;

    // 🕒 Cooldown 2 s
    const now = Date.now();
    if (cooldowns.has(jid) && now - cooldowns.get(jid) < 2000) {
      await sock.sendMessage(jid, { react: { text: "⏳", key: message.key } });
      return;
    }
    cooldowns.set(jid, now);

    let imagePath = null;
    let reply = "⚠️ No se pudo generar respuesta.";
    const prompt = args.join(" ") || "Describe esta imagen.";

    try {
      if (!anthropic) {
        await sock.sendMessage(jid, { text: "❌ API no configurada." });
        return;
      }

      // 1️⃣ Buscar imagen
      const imgMsg =
        message.message?.imageMessage ||
        message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

      let content = [];

      if (prompt) {
        content.push({
          type: "text",
          text: prompt
        });
      }

      if (imgMsg) {
        const wrapperMsg = { message: { imageMessage: imgMsg } };
        const buffer = await safeDownload(sock, wrapperMsg);

        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: buffer.toString("base64")
          }
        });
      }

      // 2️⃣ Claude request
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content
          }
        ]
      });

      reply = response.content?.[0]?.text?.trim() || reply;

      // 3️⃣ Responder
      await sock.sendMessage(jid, {
        text: reply,
        mentions: [sender],
      });

    } catch (err) {
      console.error("❌ Error en comando AI:", err);

      let errorMsg = "❌ Error al procesar tu solicitud.";
      if (err?.message?.includes("401")) errorMsg = "⚠️ API key inválida.";
      else if (err?.message?.includes("network")) errorMsg = "🌐 Error de conexión.";
      else if (err?.message?.includes("quota")) errorMsg = "🚫 Límite de uso alcanzado.";
      else if (err?.message?.includes("descargar")) errorMsg = "⚠️ No se pudo descargar la imagen.";

      await sock.sendMessage(jid, { text: errorMsg });
    }
  },
};