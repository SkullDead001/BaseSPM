const fs = require("fs");
const images = require("../../utils/images");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = {
  name: "setimg",
  alias: ["setimagen", "cambiarimg"],
  description: "Reemplaza imágenes del sistema.",
  noCooldown: true,

  exec: async ({ sock, message, args }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith("@g.us")) return;

      const sender = message.key.participant || jid;

      // 👑 Verificar admin
      const groupMeta = await sock.groupMetadata(jid);
      const admins = groupMeta.participants
        .filter(p => p.admin === "admin" || p.admin === "superadmin")
        .map(p => p.id);

      if (!admins.includes(sender)) {
        await sock.sendMessage(jid, {
          text: `> 🚫 ᴀᴄᴄᴇsᴏ ᴅᴇɴᴇɢᴀᴅᴏ

* *👑 ᴀᴅᴍɪɴ ʀᴇǫᴜᴇʀɪᴅᴏ*
> sᴏʟᴏ ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴘᴜᴇᴅᴇɴ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ.`
        });
        return;
      }

      // 🔎 Obtener imágenes registradas
      const listaImagenes = Object.entries(images).filter(
        ([_, ruta]) => fs.existsSync(ruta)
      );

      if (!listaImagenes.length) {
        await sock.sendMessage(jid, {
          text: `> ⚠️ sɪɴ ɪᴍᴀ́ɢᴇɴᴇs

* *📂 ᴇsᴛᴀᴅᴏ*
> ɴᴏ ʜᴀʏ ɪᴍᴀ́ɢᴇɴᴇs ʀᴇɢɪsᴛʀᴀᴅᴀs.`
        });
        return;
      }

      // 📋 MOSTRAR LISTA
      if (!args.length) {
        let texto = `> 🎨 sɪsᴛᴇᴍᴀ ᴅᴇ ɪᴍᴀ́ɢᴇɴᴇs

* *📂 ʟɪsᴛᴀ ᴅɪsᴘᴏɴɪʙʟᴇ*
`;

        listaImagenes.forEach(([nombre], i) => {
          texto += `> ${i + 1}. ${nombre}\n`;
        });

        texto += `

* *🛠 ᴜsᴏ*
> .setimg 1
> .setimg 1,3
> .setimg all`;

        await sock.sendMessage(jid, { text: texto });
        return;
      }

      const input = args[0].toLowerCase();
      let seleccionadas = [];

      if (input === "all") {
        seleccionadas = listaImagenes;
      } else {
        const indices = input.split(",").map(n => parseInt(n.trim()) - 1);

        seleccionadas = indices
          .filter(i => i >= 0 && i < listaImagenes.length)
          .map(i => listaImagenes[i]);
      }

      if (!seleccionadas.length) {
        await sock.sendMessage(jid, {
          text: `> ❌ sᴇʟᴇᴄᴄɪᴏ́ɴ ɪɴᴠᴀ́ʟɪᴅᴀ

* *⚠️ ᴠᴇʀɪғɪᴄᴀ*
> ᴜsᴀ ɴᴜ́ᴍᴇʀᴏs ᴠᴀ́ʟɪᴅᴏs ᴅᴇ ʟᴀ ʟɪsᴛᴀ.`
        });
        return;
      }

      // 📤 Pedir imagen nueva
      await sock.sendMessage(jid, {
        text: `> 📤 ᴇɴᴠɪ́ᴏ ʀᴇǫᴜᴇʀɪᴅᴏ

* *🖼 ɴᴜᴇᴠᴀ ɪᴍᴀɢᴇɴ*
> ᴇɴᴠɪ́ᴀ ʟᴀ ɴᴜᴇᴠᴀ ɪᴍᴀɢᴇɴ.
> ᴛɪᴇɴᴇs 60 sᴇɢᴜɴᴅᴏs...`
      });

      const nuevaImagen = await esperarImagen(sock, jid, sender);

      if (!nuevaImagen) {
        await sock.sendMessage(jid, {
          text: `> ⌛ ᴛɪᴇᴍᴘᴏ ᴀɢᴏᴛᴀᴅᴏ

* *❌ ᴏᴘᴇʀᴀᴄɪᴏ́ɴ ᴄᴀɴᴄᴇʟᴀᴅᴀ*`
        });
        return;
      }

      // 📥 Descargar imagen
      const stream = await downloadContentFromMessage(
        nuevaImagen,
        "image"
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 🔁 Reemplazar imágenes
      seleccionadas.forEach(([_, ruta]) => {
        fs.writeFileSync(ruta, buffer);
      });

      await sock.sendMessage(jid, {
        text: `> ✅ ᴀᴄᴛᴜᴀʟɪᴢᴀᴄɪᴏ́ɴ ᴄᴏᴍᴘʟᴇᴛᴀ

* *🖼 ɪᴍᴀ́ɢᴇɴᴇs ᴍᴏᴅɪғɪᴄᴀᴅᴀs*
> ${seleccionadas.length} ᴀʀᴄʜɪᴠᴏ(ꜱ) ʀᴇᴇᴍᴘʟᴀᴢᴀᴅᴏ(ꜱ) ᴄᴏʀʀᴇᴄᴛᴀᴍᴇɴᴛᴇ.`
      });

    } catch (err) {
      console.error("[SETIMG ERROR]", err);
      await sock.sendMessage(message.key.remoteJid, {
        text: `> ❌ ᴇʀʀᴏʀ ᴅᴇ sɪsᴛᴇᴍᴀ

* *⚠️ ᴇᴊᴇᴄᴜᴄɪᴏ́ɴ ғᴀʟʟɪᴅᴀ*`
      });
    }
  }
};

// =============================
// ⏳ Esperar imagen del admin
// =============================
async function esperarImagen(sock, jid, sender, timeout = 60000) {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      sock.ev.off("messages.upsert", handler);
      resolve(null);
    }, timeout);

    const handler = (msgUpsert) => {
      const msg = msgUpsert.messages?.[0];
      if (!msg?.message) return;

      const from = msg.key.participant || msg.key.remoteJid;

      if (from === sender && msg.key.remoteJid === jid) {
        if (msg.message.imageMessage) {
          clearTimeout(timer);
          sock.ev.off("messages.upsert", handler);
          resolve(msg.message.imageMessage);
        }
      }
    };

    sock.ev.on("messages.upsert", handler);
  });
}