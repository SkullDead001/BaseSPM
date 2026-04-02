const { DateTime } = require('luxon');
const esAdmin = require('../../utils/admin');

const cooldowns = new Map(); // 🕒 Anti-spam global de 2 s

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
  name: '4v4vv2',
  alias: [],
  description: 'Muestra plantilla 4v4 modo VV2 con horarios internacionales (solo admins)',
  noCooldown: true,


  exec: async ({ sock, message, args }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith('@g.us')) return;

      // 🕒 Cooldown 2 s
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

      if (!args.length) {
        await sock.sendMessage(jid, {
          text: '⚠️ *Debes proporcionar una hora.*\n\nEjemplo:\n> .4v4vv2 10:30 PM\n> .4v4vv2 22:30'
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
          text: `❌ *Hora inválida:* "${inputTime}"\nUsa formatos como "10:30 PM" o "22:30".`
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
        '🇦🇷 Bs. Aires': 'America/Argentina/Buenos_Aires',
        '🇨🇱 Santiago': 'America/Santiago',
        '🇵🇪 Lima': 'America/Lima',
        '🇪🇸 Madrid': 'Europe/Madrid',
        '🇻🇪 Caracas': 'America/Caracas'
      };

      let horariosTexto = '';
      for (const [pais, zona] of Object.entries(zonas)) {
        horariosTexto += `┊ • ${pais}:  ${getFormattedTimeInZone(baseDate, zona)}\n`;
      }

      // 📋 Plantilla final
      const plantilla = `
╭────────────╮
     4 𝗩𝗦 4 𝗩𝗩𝟮
╰────────────╯
╭─────────────╮
┊ 𝗛𝗢𝗥𝗔𝗥𝗜𝗢𝗦 (para las ${inputTime} MX)
┊
${horariosTexto.trim()}
┊
┊ » 𝗘𝗦𝗖𝗨𝗔𝗗𝗥𝗔
┊   ➤
┊   ➤
┊   ➤
┊   ➤
┊
┊ » 𝗦𝗨𝗣𝗟𝗘𝗡𝗧𝗘𝗦
┊   ➤
┊   ➤
╰─────────────╯
🏷️ "${groupName}"
`;

      await sock.sendMessage(jid, { text: plantilla }, { quoted: message });

    } catch (err) {
      console.error('[4v4vv2 ERROR]', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ Ocurrió un error al generar la plantilla.'
      });
    }
  }
};
