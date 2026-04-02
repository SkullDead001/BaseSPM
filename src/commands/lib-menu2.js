const fs = require("fs");
const images = require("../../utils/images");

// 🧩 Registro antispam compartido
const cooldowns = new Map();

module.exports = {
  name: "menu2",
  alias: ["help2"],
  description: "Muestra el menú secundario con diseño mejorado.",
  noCooldown: true,


  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || jid;

      // 🚫 Protección antispam
      const now = Date.now();
      const last = cooldowns.get(sender) || 0;
      if (now - last < 5000) return;
      cooldowns.set(sender, now);

      // 🕓 Hora y fecha (MX)
      const hora = new Date().toLocaleTimeString("es-MX", {
        timeZone: "America/Mexico_City",
        hour12: false,
      });
      const fecha = new Date().toLocaleDateString("es-MX", {
        timeZone: "America/Mexico_City",
      });

      // “Leer más” invisible
      const leerMas = "\u200E".repeat(4000);

      const texto = `
╭━━━━━━━━━━━━━━━━━╮
> ⚙️ Mᴇɴᴜ́ Nᴜᴍᴇʀᴏ 2 ⚙️
╰━━━━━━━━━━━━━━━━━╯

─────────────
* *Cᴏᴍᴀɴᴅᴏs ᴅᴇ ʟɪʙʀᴇ ᴜꜱᴏ*
_Usᴀʟᴏs ᴄᴏɴ ᴍᴏᴅᴇʀᴀᴄɪᴏɴ_
─────────────

*Cᴀᴛᴇɢᴏʀɪ́ᴀs*
───────────
*1. Dᴇsᴄᴀʀɢᴀs/AI*
*2. Jᴜᴇɢᴏs/Fʀᴇᴇ Fɪʀᴇ*

${leerMas}

╭─┈ *Dᴇꜱᴄᴀʀɢᴀꜱ ʏ Hᴇʀʀᴀᴍɪᴇɴᴛᴀꜱ*
│
│ *Dᴇsᴄᴀʀɢᴀs:*
│ • *.ʏᴛ3* » Mᴜ́ꜱɪᴄᴀ (ᴍᴘ3) 
│ • *.ʏᴛ4* » Vɪᴅᴇᴏ (ᴍᴘ4) 
│ • *.ᴅʀɪᴠᴇ* » {ᴜʀʟ}
│ • *.ᴍᴇᴅɪᴀғɪʀᴇ* » {ᴜʀʟ} 
│ • *.ᴍᴇɢᴀ* » {ᴜʀʟ} 
│ 
│ *Sᴛɪᴄᴋᴇʀs ʏ AI:*
│ • *.s* » Dᴇ ɪᴍᴀɢᴇɴ ᴀ ꜱᴛɪᴄᴋᴇʀ
│ • *.ᴏ̨ᴄ* » Sᴛɪᴄᴋᴇʀ ᴘᴇʀsᴏɴᴀʟɪᴢᴀᴅᴏ
│ • *.ᴀɪ* » Cᴏɴsᴜʟᴛᴀʀ Gᴇᴍɪɴɪ | OᴘᴇɴAI 
│ 
│ *Uᴛɪʟɪᴅᴀᴅᴇs:*
│ • *.ɢᴇɴ* » Bɪɴꜱ ʏ ᴄᴏ́ᴅɪɢᴏs
│ • *.ᴘʜ4* » Bᴜsᴄᴀᴅᴏʀ ᴘᴀʀᴀ ᴀᴅᴜʟᴛᴏs
╰─┈

╭─┈ *Jᴜᴇɢᴏꜱ ᴅᴇ Gʀᴜᴘᴏ*
│
│ *Rᴇᴛᴏs Y Dɪᴠᴇʀsɪᴏ́ɴ:*
│ • *.ɢᴀʏ* 
│ • *.ᴛᴏᴘꜱɢᴀʏ* 
│ • *.ᴊᴜᴇɢᴏ ᴍᴀᴛᴇꜱ* 
│ • *.ᴊᴜᴇɢᴏ ᴇᴍᴏᴊɪ*
│ • *.ᴊᴜᴇɢᴏ ʀᴇᴠᴜᴇʟᴛᴀ* 
│ • *.ᴊᴜᴇɢᴏ ᴀʜᴏʀᴄᴀᴅᴏ* 
│ • *.ᴊᴜᴇɢᴏ ᴀᴅɪᴠɪɴᴀ* 
│ • *.ᴅᴜᴇʟᴏ @ᴘᴇʀsᴏɴᴀ* » 1ᴠ1
╰─┈

╭─┈ *Fʀᴇᴇ Fɪʀᴇ (Fɪᴊᴀʀ Hᴏʀᴀ)*
│
│ • *.4ᴠ4ᴄʟᴋ* » Hᴏʀᴀ:ᴍɪɴᴜᴛᴏs ᴘᴍ/ᴀᴍ
│ • *.4ᴠ4ᴠᴠ2* » Hᴏʀᴀ:ᴍɪɴᴜᴛᴏs ᴘᴍ/ᴀᴍ
│ • *.6ᴠ6ᴄʟᴋ* » Hᴏʀᴀ:ᴍɪɴᴜᴛᴏs ᴘᴍ/ᴀᴍ
│ • *.6ᴠ6ᴠᴠ2* » Hᴏʀᴀ:ᴍɪɴᴜᴛᴏs ᴘᴍ/ᴀᴍ
│ • *.8ᴠ8*   » Hᴏʀᴀ:ᴍɪɴᴜᴛᴏs ᴘᴍ/ᴀᴍ
│ • *.12ᴠ12* » Hᴏʀᴀ:ᴍɪɴᴜᴛᴏs ᴘᴍ/ᴀᴍ
╰─┈
`;

      // 📸 Enviar con imagen si existe
      if (fs.existsSync(images.menu2)) {
        const imgBuffer = fs.readFileSync(images.menu2);
        await sock.sendMessage(jid, {
          image: imgBuffer,
          caption: texto,
          mentions: [sender],
        });
      } else {
        await sock.sendMessage(jid, { text: texto, mentions: [sender] });
      }
    } catch (err) {
      console.error("[MENU2 ERROR]", err);
      await sock.sendMessage(message.key.remoteJid, {
        text: "❌ Error al mostrar el menú 2.",
      });
    }
  },
};
