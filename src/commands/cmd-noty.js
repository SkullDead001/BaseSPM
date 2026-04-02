const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const esAdmin = require("../../utils/admin");

const cooldowns = new Map();

// 🎯 Función para desempaquetar mensajes especiales
function unwrapQuoted(obj) {
    if (!obj) return null;

    if (obj.viewOnceMessage) return unwrapQuoted(obj.viewOnceMessage.message);
    if (obj.viewOnceMessageV2) return unwrapQuoted(obj.viewOnceMessageV2.message);
    if (obj.ephemeralMessage) return unwrapQuoted(obj.ephemeralMessage.message);
    if (obj.documentWithCaptionMessage) return unwrapQuoted(obj.documentWithCaptionMessage.message);
    if (obj.buttonsMessage) return unwrapQuoted(obj.buttonsMessage.message);
    if (obj.templateMessage?.hydratedTemplate) return unwrapQuoted(obj.templateMessage.hydratedTemplate);
    if (obj.listResponseMessage) return unwrapQuoted(obj.listResponseMessage);
    if (obj.interactiveResponseMessage) return unwrapQuoted(obj.interactiveResponseMessage);

    return obj; // contenido real
}

// 🎯 Obtener media buffer para reenviar
async function getMedia(msg) {
    const type = Object.keys(msg)[0];
    const content = msg[type];

    const valid = ["imageMessage", "videoMessage", "audioMessage", "stickerMessage", "documentMessage"];
    if (!valid.includes(type)) return null;

    const mediaType = type.replace("Message", "");
    const stream = await downloadContentFromMessage(content, mediaType);

    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    return {
        buffer,
        mediaType,
        mimetype: content.mimetype,
        caption: content.caption,
        fileName: content.fileName
    };
}

module.exports = {
    name: "noty",
    alias: ["n", "hidetag", "notify"],
    description: "Reenvía texto/multimedia citado mencionando a todos sin mostrar @.",
    noCooldown: true,


    exec: async ({ sock, message }) => {
        try {
            const jid = message.key.remoteJid;
            if (!jid.endsWith("@g.us")) return;

            const sender = message.key.participant || jid;

            // Anti-Spam (1.5s)
            const now = Date.now();
            const key = `${jid}:${sender}`;
            if (cooldowns.has(key) && now - cooldowns.get(key) < 1500) return;
            cooldowns.set(key, now);

            // Solo admins
            const admin = await esAdmin(sock, jid, message);
            if (!admin && !message.key.fromMe) return;

            // Lista de menciones (ocultas)
            const metadata = await sock.groupMetadata(jid);
            const participants = metadata.participants.map(p => p.id);

            // Texto adicional del comando
            const rawText =
                message.message?.conversation ||
                message.message?.extendedTextMessage?.text ||
                "";

            const firstSpace = rawText.indexOf(" ");
            const extra = firstSpace !== -1 ? rawText.slice(firstSpace + 1).trim() : "";

            const firma = `\n\n> BᴏʙMᴀʀʟᴇʏ☽ Bᴏᴛ`;
            const finalText = extra ? extra + firma : firma;

            // ------------------------------------------
            // 1️⃣ MENSAJE CITADO
            // ------------------------------------------
            let quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (quoted) {
                quoted = unwrapQuoted(quoted);

                const qType = Object.keys(quoted)[0];

                // 📝 TEXTO CITADO
                if (qType === "conversation") {
                    await sock.sendMessage(jid, {
                        text: quoted.conversation,
                        mentions: participants
                    });

                    if (extra) {
                        await sock.sendMessage(jid, { text: finalText, mentions: participants });
                    }
                    return;
                }

                if (qType === "extendedTextMessage") {
                    await sock.sendMessage(jid, {
                        text: quoted.extendedTextMessage.text,
                        mentions: participants
                    });

                    if (extra) {
                        await sock.sendMessage(jid, { text: finalText, mentions: participants });
                    }
                    return;
                }

                // 🎞 MEDIA CITADA (imagen/video/sticker/etc)
                const media = await getMedia(quoted);
                if (media) {
                    const payload = {
                        [media.mediaType]: media.buffer,
                        mentions: participants
                    };

                    if (media.caption) payload.caption = media.caption;
                    if (media.fileName) payload.fileName = media.fileName;
                    if (media.mimetype) payload.mimetype = media.mimetype;
                    if (media.mediaType === "audio") payload.ptt = true;

                    await sock.sendMessage(jid, payload);

                    if (extra) {
                        await sock.sendMessage(jid, { text: finalText, mentions: participants });
                    }

                    return;
                }

                // 🔄 Si no se detecta tipo, se manda texto simple
                await sock.sendMessage(jid, {
                    text: extra || "(Mensaje reenviado)",
                    mentions: participants
                });

                return;
            }

            // ------------------------------------------
            // 2️⃣ SIN CITA → REENVÍO DE PROPIO MENSAJE
            // ------------------------------------------
            const type = Object.keys(message.message)[0];
            const msg = message.message[type];

            // Texto propio
            if (type === "conversation" || type === "extendedTextMessage") {
                await sock.sendMessage(jid, { text: finalText, mentions: participants });
                return;
            }

            // Media propia
            const own = await getMedia({ [type]: msg });
            if (own) {
                const payload = {
                    [own.mediaType]: own.buffer,
                    mentions: participants
                };

                if (msg.caption || extra) payload.caption = msg.caption || extra + firma;
                if (msg.fileName) payload.fileName = msg.fileName;
                if (msg.mimetype) payload.mimetype = msg.mimetype;
                if (own.mediaType === "audio") payload.ptt = true;

                await sock.sendMessage(jid, payload);
                return;
            }

            // Fallback
            await sock.sendMessage(jid, { text: finalText, mentions: participants });

        } catch (err) {
            console.error("[NOTY ERROR]", err);
        }
    }
};
