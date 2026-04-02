const cooldowns = new Map();

module.exports = {
  name: 'gay',
  alias: ['profesional'],
  description: 'Calcula qué tan gay es un usuario 🏳️‍🌈 (broma divertida)',
  noCooldown: true,

  
  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || message.key.remoteJid;

      // 🕒 Cooldown global 2 s
      const now = Date.now();
      if (cooldowns.has(jid) && now - cooldowns.get(jid) < 2000) {
        await sock.sendMessage(jid, { react: { text: '⏳', key: message.key } });
        return;
      }
      cooldowns.set(jid, now);

      // Obtener texto y menciones
      const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
      const mentionedJid = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const objetivo = mentionedJid.length
        ? `@${mentionedJid[0].split('@')[0]}`
        : `@${sender.split('@')[0]}`;

      // Enviar mensaje inicial
      const baseMsg = await sock.sendMessage(jid, { text: `⏳ Calculando qué tan puto eres 🏳️‍🌈...` });

      // Animación "de carga" (sin editar, actualiza con intervalos)
      const pasos = [
        '█▒▒▒▒▒▒▒▒▒ 10%',
        '███▒▒▒▒▒▒▒ 30%',
        '██████▒▒▒▒ 60%',
        '█████████▒ 90%',
        '██████████ 100%'
      ];

      for (const paso of pasos) {
        await new Promise(r => setTimeout(r, 600));
        await sock.sendMessage(jid, { text: `Cargando... ${paso}`, edit: baseMsg.key }).catch(() => {});
      }

      // Generar resultado
      const porcentaje = Math.floor(Math.random() * 101);
      let comentario = '';

      if (porcentaje <= 40) comentario = 'Así empiezan 😏🏳️‍🌈';
      else if (porcentaje <= 60) comentario = 'Muy puto mi bro, checate 😂🏳️‍🌈';
      else comentario = 'ReMaricón, más de lo pensado 💅🏳️‍🌈';

      // Enviar resultado final
      await new Promise(r => setTimeout(r, 800));
      await sock.sendMessage(jid, {
        text: `🏳️‍🌈 *Resultado del análisis gayómetro* 🏳️‍🌈\n\n👤 ${objetivo}\n📊 Nivel: *${porcentaje}% Puto*\n💬 ${comentario}`,
        mentions: mentionedJid.length ? mentionedJid : [sender]
      });

    } catch (err) {
      console.error('[GAY CMD ERROR]', err);
      await sock.sendMessage(message.key.remoteJid, { text: '❌ Ocurrió un error inesperado.' });
    }
  }
};
