const esAdmin = require('../../utils/admin');

module.exports = {
  name: 'kick',
  alias: ['echar', 'hechar', 'sacar', 'ban'],
  description: 'Expulsa a un usuario del grupo (solo admins, intentará aunque el bot no sea admin)',
  noCooldown: true,

  
  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;

      if (!jid.endsWith('@g.us')) return; // Solo grupos

      // Verificar admin
      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        // Si no es admin, reacciona pero no manda texto
        await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
        return;
      }

      // Usuario a expulsar (mencionado o citado)
      const user = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] 
                  || message.message?.extendedTextMessage?.contextInfo?.participant;

      if (!user) return; // Si no hay usuario, no hace nada

      // Evitar expulsar al bot
      if (user === sock.user.id) return;

      // Intentar expulsar (si falla, simplemente no responde nada)
      try {
        await sock.groupParticipantsUpdate(jid, [user], 'remove');
      } catch (err) {
        console.error(`⚠️ No se pudo expulsar a ${user}`, err);
      }

    } catch (err) {
      console.error('Error en comando kick:', err);
    }
  }
};
