const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, '../error/logs.txt');

function log(msg) {
  const time = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  fs.appendFileSync(logPath, `\n[ANTILINK] ${time} | ${msg}`);
}

module.exports = async ({ sock, message }) => {
  try {
    log('➡️ Ejecutado');

    if (!message || !message.message) {
      log('⛔ message vacío');
      return;
    }

    const jid = message.key.remoteJid;
    log(`📍 JID: ${jid}`);

    // solo grupos
    if (!jid.endsWith('@g.us')) {
      log('⛔ No es grupo');
      return;
    }

    if (message.key.fromMe) {
      log('⛔ Mensaje del bot');
      return;
    }

    const sender = message.key.participant;
    if (!sender) {
      log('⛔ sender indefinido');
      return;
    }

    log(`👤 Sender: ${sender}`);

    // config
    const antilinkPath = path.join(__dirname, '../data/antilink', `${jid}.json`);
    if (!fs.existsSync(antilinkPath)) {
      log('⛔ No existe config antilink');
      return;
    }

    const antilink = JSON.parse(fs.readFileSync(antilinkPath, 'utf8'));
    log(`⚙️ Config: enabled=${antilink.enabled}, kick=${antilink.kick}`);

    if (!antilink.enabled) {
      log('⛔ Antilink desactivado');
      return;
    }

    // texto
    const text =
      message.message.conversation ||
      message.message.extendedTextMessage?.text ||
      message.message.imageMessage?.caption ||
      message.message.videoMessage?.caption;

    if (!text) {
      log('⛔ Sin texto');
      return;
    }

    log(`📝 Texto: ${text}`);

    // regex FULL
    const linkRegex =
      /(?:https?:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com\/|t\.me\/|bit\.ly\/|fb\.me\/)[^\s]+/i;

    if (!linkRegex.test(text)) {
      log('⛔ No es link');
      return;
    }

    log('🔗 LINK DETECTADO');

    // admins
// admins reales
const meta = await sock.groupMetadata(jid);

const participante = meta.participants.find(p => 
  p.id === sender || 
  p.id.split(':')[0] === sender.split('@')[0]
);

if (participante && participante.admin) {
  log('⛔ Sender es admin (omitido)');
  return;
}

    
    // borrar mensaje
    try {
      await sock.sendMessage(jid, {
        delete: {
          remoteJid: jid,
          fromMe: false,
          id: message.key.id,
          participant: sender,
        },
      });
      log('🗑️ Mensaje eliminado');
    } catch (e) {
      log('❌ Error al eliminar: ' + e.message);
    }

    // expulsión
/* =========================
   📢 AVISO + EXPULSIÓN (SI kick=true)
========================= */
if (antilink.kick === true) {
  try {
    // 📢 Aviso previo
    await sock.sendMessage(jid, {
      text: `> 🚫 *ANTILINK ACTIVADO*

@${sender.split('@')[0]}
Eɴᴠɪᴏ́ ᴜɴ ʟɪɴᴋ ɴᴏ ᴀᴜᴛᴏʀɪᴢᴀᴅᴏ.

🚪 Sᴇʀᴀ́ *ᴇxᴘᴜʟsᴀᴅᴏ* ᴅᴇʟ ɢʀᴜᴘᴏ.`,
      mentions: [sender],
    });

    log('📢 Aviso enviado');

    // ⏳ pequeño delay para que se vea el mensaje
    await new Promise(r => setTimeout(r, 1500));

    // 🚪 Expulsión
    await sock.groupParticipantsUpdate(jid, [sender], 'remove');
    log('🚪 Usuario expulsado');

  } catch (e) {
    log('❌ Error en aviso/expulsión (¿bot sin admin?): ' + e.message);
  }
}


  } catch (err) {
    log('💥 ERROR GENERAL: ' + (err.stack || err.message));
  }
};
