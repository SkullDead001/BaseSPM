const { DateTime } = require('luxon');
const esAdmin = require('../../utils/admin');

const cooldowns = new Map(); // 🕒 Control de spam (2 segundos)

// 📌 Función auxiliar para formatear la hora
function getFormattedTimeInZone(baseDate, timeZone) {
  const options = {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  return new Intl.DateTimeFormat('es-MX', options).format(baseDate);
}

module.exports = {
  name: '16v16',
  alias: [],
  description: 'Muestra plantilla 16v16 con horarios internacionales (solo admins)',
  noCooldown: true,


  exec: async ({ sock, message, args }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith('@g.us')) return; // Solo grupos

      // 🕒 Anti-spam
      const now = Date.now();
      if (cooldowns.has(jid) && now - cooldowns.get(jid) < 2000) {
        await sock.sendMessage(jid, { react: { text: '⏳', key: message.key } });
        return;
      }
      cooldowns.set(jid, now);

      // 🔒 Verificar admin
      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
        return;
      }

      // 🕐 Validar argumento
      if (!args.length) {
        await sock.sendMessage(jid, {
          text: '⚠️ *Debes proporcionar una hora.*\n\nEjemplo:\n> .16v16 10:00 PM\n> .16v16 22:00'
        });
        return;
      }

      const inputTime = args.join(' ');
      const baseZone = 'America/Mexico_City';

      // 🕐 Parseo con Luxon (acepta 12h o 24h)
      let baseDateTime = DateTime.fromFormat(inputTime.toUpperCase(), 'h:mm a', { zone: baseZone });
      if (!baseDateTime.isValid)
        baseDateTime = DateTime.fromFormat(inputTime, 'H:mm', { zone: baseZone });

      if (!baseDateTime.isValid) {
        await sock.sendMessage(jid, {
          text: `❌ *Hora inválida:* "${inputTime}"\nUsa formatos como "10:00 PM" o "22:00".`
        });
        return;
      }

      const baseDate = baseDateTime.toJSDate();
      const groupMetadata = await sock.groupMetadata(jid);
      const groupName = groupMetadata?.subject || 'Grupo';

      // 🌎 Horarios internacionales
      const zonas = {
        '🇲🇽 GDL/CDMX': 'America/Mexico_City',
        '🇨🇴 Bogotá': 'America/Bogota',
        '🇵🇪 Lima': 'America/Lima',
        '🇨🇱 Santiago': 'America/Santiago',
        '🇦🇷 Bs. Aires': 'America/Argentina/Buenos_Aires',
        '🇻🇪 Caracas': 'America/Caracas',
        '🇪🇸 Madrid': 'Europe/Madrid'
      };

      let horariosTexto = '';
      for (const [pais, zona] of Object.entries(zonas)) {
        horariosTexto += `│ ${pais}:  ${getFormattedTimeInZone(baseDate, zona)}\n`;
      }

      // 🎮 Plantilla 16v16
      const plantilla = `
╭────────────╮
     16 𝗩𝗘𝗥𝗦𝗨𝗦 16
╰────────────╯
╭─────────────╮
│ 𝗛𝗢𝗥𝗔𝗥𝗜𝗢𝗦 (para las ${inputTime} MX)
│
${horariosTexto.trim()}
│
│ 🎮 *Modalidad:* Libre
│ 👥 *Jugadores:* 16v16
│
│ » 𝗘𝗦𝗖𝗨𝗔𝗗𝗥𝗔 𝟭
│   👑 ➤
│   🥷 ➤
│   🥷 ➤
│   🥷 ➤
│
│ » 𝗘𝗦𝗖𝗨𝗔𝗗𝗥𝗔 𝟮
│   👑 ➤
│   🥷 ➤
│   🥷 ➤
│   🥷 ➤
│
│ » 𝗘𝗦𝗖𝗨𝗔𝗗𝗥𝗔 𝟯
│   👑 ➤
│   🥷 ➤
│   🥷 ➤
│   🥷 ➤
│
│ » 𝗘𝗦𝗖𝗨𝗔𝗗𝗥𝗔 𝟰
│   👑 ➤
│   🥷 ➤
│   🥷 ➤
│   🥷 ➤
│
│ 🔁 *Suplentes:*
│   ➤
│   ➤
│   ➤
╰─────────────╯
🏷️ "${groupName}"
`;

      await sock.sendMessage(jid, { text: plantilla }, { quoted: message });

    } catch (err) {
      console.error('[16v16 ERROR]', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Ocurrió un error al generar la plantilla.'
      });
    }
  }
};
