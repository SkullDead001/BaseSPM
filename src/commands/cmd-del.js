const esAdmin = require('../../utils/admin');

module.exports = {
    name: 'del',
    aliases: ['delete'],
    description: 'Elimina un mensaje citado al usar el comando (solo admins)',
    noCooldown: true,
    
    exec: async ({ sock, message }) => {
        try {
            const jid = message.key.remoteJid;
            const sender = message.key.participant || jid;

            if (!jid.endsWith('@g.us')) return; // Solo grupos

            // Verificar si es admin
            const admin = await esAdmin(sock, jid, message);
            if (!admin && !message.key.fromMe) {
                // Reaccionar con ⚠️ si no es admin
                await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
                return;
            }

            // Verifica que sea respuesta a un mensaje
            const contextInfo = message.message?.extendedTextMessage?.contextInfo;
            if (!contextInfo || !contextInfo.stanzaId) {
                return await sock.sendMessage(jid, { text: '⚠️ Mᴀʟ ᴜsᴏ ᴅᴇʟ ᴄᴏᴍᴀɴᴅᴏ ⚠️\n> ᴇsᴘᴏɴᴅᴇ ᴜɴ ᴍᴇɴsᴀᴊᴇ ᴅᴇ ᴀʟɢᴜɴ ᴜsᴜᴀʀɪᴏ' }, { quoted: message });
            }

            const key = {
                remoteJid: jid,
                fromMe: contextInfo.participant === sock.user.id, // si el mensaje es del bot
                id: contextInfo.stanzaId,
                participant: contextInfo.participant || jid
            };

            // Intenta eliminar el mensaje
            await sock.sendMessage(jid, { delete: key });

        } catch (err) {
            console.error('[DEL ERROR]', err);
            await sock.sendMessage(message.key.remoteJid, { text: '❌ No se pudo eliminar el mensaje. Asegúrate de que el bot sea admin si es de otro usuario.' }, { quoted: message });
        }
    }
};
