const cooldowns = new Map();

module.exports = {
  name: 'topgays',
  alias: ['topputos', 'topmarikos'],
  description: 'Muestra un ranking aleatorio de los más gays del grupo 🏳️‍🌈 (broma divertida)',
  noCooldown: true,

  
  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith('@g.us')) return;

      // 🕒 Cooldown global 2 s (antispam)
      const now = Date.now();
      if (cooldowns.has(jid) && now - cooldowns.get(jid) < 2000) {
        await sock.sendMessage(jid, { react: { text: '⏳', key: message.key } });
        return;
      }
      cooldowns.set(jid, now);

      // 📋 Obtener miembros del grupo
      const groupMetadata = await sock.groupMetadata(jid);
      let participants = groupMetadata.participants.map(p => p.id);

      if (participants.length === 0) {
        await sock.sendMessage(jid, { text: '❌ No hay miembros en el grupo.' });
        return;
      }

      // 🎲 Mezclar aleatoriamente y elegir máximo 5
      participants = participants.sort(() => Math.random() - 0.5).slice(0, 5);

      // 🕐 Mensaje inicial
      const baseMsg = await sock.sendMessage(jid, { text: '🔍 Buscando a los más gays del grupo... 💅' });

      // 💫 Animación segura (sin usar edit)
      const animaciones = [
        '💋 Escaneando culitos activos...',
        '🍑 Analizando posiciones...',
        '🌈 Midiendo niveles de mariconidad...',
        '💅 Casi listo...',
        '🏳️‍🌈 Resultados finales detectados...'
      ];

      for (const paso of animaciones) {
        await new Promise(r => setTimeout(r, 800));
        await sock.sendMessage(jid, { text: paso, edit: baseMsg.key }).catch(() => {});
      }

      // 🏆 Generar el top aleatorio
      let texto = '🏳️‍🌈 *TOP 5 DE LOS MÁS GAYS DEL GRUPO* 🏳️‍🌈\n\n';
      participants.forEach((user, index) => {
        const medalla = ['🥇', '🥈', '🥉', '💋', '🍑'][index] || '✨';
        texto += `${medalla} *${index + 1}. @${user.split('@')[0]}*\n`;
      });

      texto += '\n🌈 *Los detectó el radar SupremTX 3000™* 💅';

      // 🏁 Enviar mensaje final
      await new Promise(r => setTimeout(r, 1200));
      await sock.sendMessage(jid, { text: texto, mentions: participants });

    } catch (err) {
      console.error('[TOPGAYS ERROR]', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Ocurrió un error al generar el top.'
      });
    }
  }
};
