const { DateTime } = require('luxon');
const esAdmin = require('../../utils/admin');

const cooldowns = new Map(); // 🕒 Anti-spam global (2 s)

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
  name: '8v8',
  alias: [],
  description: 'Muestra plantilla 8v8 con horarios internacionales (solo admins)',
  noCooldown: true,


  exec: async ({ sock, message, args }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith('@g.us')) return; // Solo grupos

      // 🕒 Cooldown global de 2 s
      const now = Date.now();
      if (cooldowns.has(jid) && now - cooldowns.get(jid) < 2000) {
        await sock.sendMessage(jid, { react: { text: '⏳', key: message.key } });
        return;
      }
      cooldowns.set(jid, now);

      // 🔒 Verificar si es admin
      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
        return;
      }

      // ⏰ Validar hora
      if (!args.length) {
        await sock.sendMessage(jid, {
          text: '⚠️ *Debes proporcionar una hora.*\n\nEjemplo:\n> .8v8 7:00 PM\n> .8v8 19:00'
        });
        return;
      }

      const inputTime = args.join(' ');
      const baseZone = 'America/Mexico_City';

      // 🕐 Parseo flexible
      let baseDateTime = DateTime.fromFormat(inputTime.toUpperCase(), 'h:mm a', { zone: baseZone });
      if (!baseDateTime.isValid)
        baseDateTime = DateTime.fromFormat(inputTime, 'H:mm', { zone: baseZone });

      if (!baseDateTime.isValid) {
        await sock.sendMessage(jid, {
          text: `❌ *Hora inválida:* "${inputTime}"\nUsa formatos como "7:00 PM" o "19:00".`
        });
        return;
      }

      const baseDate = baseDateTime.toJSDate();
      const groupMetadata = await sock.groupMetadata(jid);
      const groupName = groupMetadata?.subject || 'Grupo';

      // 🌍 Horarios internacionales
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

      // 🧩 Plantilla final SupremTX
      const plantilla = `
╭────────────╮
     8 𝗩𝗘𝗥𝗦𝗨𝗦 8
╰────────────╯
╭─────────────╮
│ 𝗛𝗢𝗥𝗔𝗥𝗜𝗢𝗦 (para las ${inputTime} MX)
│
${horariosTexto.trim()}
│
│ 🎮 *Modalidad:* Libre
│ 👥 *Jugadores:* 8v8
│
│ » 𝗘𝗦𝗖𝗨𝗔𝗗𝗥𝗔 𝟭
│   👑 ➤
│   🥷 ➤
│   🥷 ➤
│   🥷 ➤
│   🥷 ➤
│   🥷 ➤
│   🥷 ➤
│   🥷 ➤
│
│ » 𝗘𝗦𝗖𝗨𝗔𝗗𝗥𝗔 𝟮
│   👑 ➤
│   🥷 ➤
│   🥷 ➤
│   🥷 ➤
│   🥷 ➤
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
      console.error('[8v8 ERROR]', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Ocurrió un error al generar la plantilla.'
      });
    }
  }
};
