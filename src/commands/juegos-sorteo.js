const sorteos = new Map();
const esAdmin = require('../../utils/admin');
const cooldowns = new Map();

module.exports = {
  name: 'sorteo',
  alias: ['registrar', 'finalizar'],
  description: 'Gestiona sorteos dentro del grupo (solo admins pueden iniciar o finalizar)',
  noCooldown: true,


  exec: async ({ sock, message, args }) => {
    try {
      const jid = message.key.remoteJid;
      const sender = message.key.participant || message.key.remoteJid;
      if (!jid.endsWith('@g.us')) return;

      // 🕒 Cooldown global de 2 s
      const now = Date.now();
      if (cooldowns.has(jid) && now - cooldowns.get(jid) < 2000) {
        await sock.sendMessage(jid, { react: { text: '⏳', key: message.key } });
        return;
      }
      cooldowns.set(jid, now);

      // Determinar comando
      const body = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
      const comando = body?.trim().split(' ')[0]?.replace('.', '').toLowerCase();

      // ----------------------------
      // 🌀 INICIAR SORTEO
      // ----------------------------
      if (comando === 'sorteo') {
        const admin = await esAdmin(sock, jid, message);
        if (!admin && !message.key.fromMe) {
          await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
          return;
        }

        if (sorteos.has(jid) && sorteos.get(jid).activo) {
          await sock.sendMessage(jid, { text: '⚠️ Ya hay un sorteo activo.\nUsa *.finalizar* antes de crear otro.' });
          return;
        }

        const mensaje = args.join(' ') || '🎉 ¡Nuevo sorteo disponible!';
        sorteos.set(jid, { mensaje, participantes: new Set(), activo: true });

        const meta = await sock.groupMetadata(jid);
        const mentions = meta.participants.map(p => p.id);

        await sock.sendMessage(jid, {
          text: `* 🎲 *Nᴜᴇᴠᴏ sᴏʀᴛᴇᴏ*\n\nPʀᴇᴍɪᴏ\n> ${mensaje}\n\Usᴀ _.ʀᴇɢɪsᴛʀᴀʀ_ ᴘᴀʀᴀ ᴘᴀʀᴛɪᴄɪᴘᴀʀ\n\n> Nᴏᴛᴀ\n* ᴀʟ ғɪɴᴀʟɪᴢᴀʀ ᴇʟ sᴏʀᴛᴇᴏ ᴘᴜᴇᴅᴇs ᴇʟᴇɢɪʀ 1 ᴏ ᴍᴀs ɢᴀɴᴀᴅᴏʀᴇs ᴀɢʀᴇɢᴀɴᴅᴏ ᴜɴ ɴᴜᴍᴇʀᴏ ᴀʟ ᴄᴏᴍᴀɴᴅᴏ\n> ғɪɴᴀʟɪᴢᴀʀ 2\n> ғɪɴᴀʟɪᴢᴀʀ 5\n\n> sɪ ᴇs sᴏʟᴏ ᴜɴᴀ ᴘᴇʀsᴏɴᴀ ᴘᴏɴ ᴇʟ ᴄᴏᴍᴀɴᴅᴏ sᴏʟᴏ`,
          mentions
        });
        return;
      }


      // ----------------------------
      // 🧾 REGISTRARSE EN EL SORTEO
      // ----------------------------
      if (comando === 'registrar') {
        const sorteo = sorteos.get(jid);
        if (!sorteo || !sorteo.activo) {
          await sock.sendMessage(jid, { text: '❌ No hay un sorteo activo actualmente.' });
          return;
        }

        if (sorteo.participantes.has(sender)) {
          await sock.sendMessage(jid, { text: `⚠️ Ya estás registrado en el sorteo, @${sender.split('@')[0]}.`, mentions: [sender] });
          return;
        }

        sorteo.participantes.add(sender);
        const lista = Array.from(sorteo.participantes)
          .map((p, i) => `${i + 1}. @${p.split('@')[0]}`)
          .join('\n');

        await sock.sendMessage(jid, {
          text: `✅ Rᴇɢɪsᴛʀᴀᴅᴏ ✅\n> Lɪsᴛᴀ ᴅᴇ ᴘᴀʀᴛɪᴄɪᴘᴀɴᴛᴇs*\n\n${lista}`,
          mentions: Array.from(sorteo.participantes)
        });
        return;
      }

      // ----------------------------
      // 🏁 FINALIZAR SORTEO (con animación editada + varios ganadores)
      // ----------------------------
      // ----------------------------
      // 🏁 FINALIZAR SORTEO (TODO en un solo mensaje editable)
      // ----------------------------
      if (comando === 'finalizar') {
        const admin = await esAdmin(sock, jid, message);
        if (!admin && !message.key.fromMe) {
          await sock.sendMessage(jid, { react: { text: '⚠️', key: message.key } });
          return;
        }

        const sorteo = sorteos.get(jid);
        if (!sorteo || !sorteo.activo) {
          await sock.sendMessage(jid, { text: '❌ No hay un sorteo activo para finalizar.' });
          return;
        }

        const participantes = Array.from(sorteo.participantes);
        if (participantes.length === 0) {
          await sock.sendMessage(jid, { text: '❌ No hay participantes registrados. Sorteo cancelado.' });
          sorteos.delete(jid);
          return;
        }

        // Número de ganadores
        let cantidad = parseInt(args[0]);
        if (isNaN(cantidad) || cantidad < 1) cantidad = 1;

        if (cantidad > participantes.length) {
          await sock.sendMessage(jid, {
            text: `❌ No hay suficientes participantes.\nParticipantes: ${participantes.length}\nGanadores solicitados: ${cantidad}`
          });
          return;
        }

        sorteo.activo = false;

        // 🟩 Enviar mensaje base (será editado)
        let msg = await sock.sendMessage(jid, { text: "> 🎰 *Eʟɪɢɪᴇɴᴅᴏ ɢᴀɴᴀᴅᴏʀᴇs. . .*" });

        // 🟡 Animación en un solo mensaje
        const pasos = [
          "> 🎲 Mᴇᴢᴄʟᴀɴᴅᴏ ɴᴏᴍʙʀᴇs. . .",
          "> 🎲 Gɪʀᴀɴᴅᴏ ʀᴜʟᴇᴛᴀ. . .",
          "> 🎯 Pʀᴇᴘᴀʀᴀɴᴅᴏ ʀᴇsᴜʟᴛᴀᴅᴏ . . ."
        ];



        for (const paso of pasos) {
          await new Promise(r => setTimeout(r, 1000));
          await sock.sendMessage(jid, {
            edit: msg.key,
            text: paso
          });
        }

        // 🟢 Elegir ganadores sin repetición
        const ganadores = [];
        const copia = [...participantes];

        for (let i = 0; i < cantidad; i++) {
          const index = Math.floor(Math.random() * copia.length);
          ganadores.push(copia[index]);
          copia.splice(index, 1);
        }

        // Crear lista final
        const listaGanadores = ganadores
          .map((g, i) => `${i + 1}. @${g.split('@')[0]}`)
          .join('\n');

        // 🟢 Editar el mensaje final
        await sock.sendMessage(jid, {
          edit: msg.key,
          text: `🏆 *Fᴇʟɪᴄɪᴅᴀᴅᴇs* 🏆\n\n${listaGanadores}\n\n> Pʀᴇᴍɪᴏ\n* ${sorteo.mensaje}`,
          mentions: ganadores
        });

        sorteos.delete(jid);
        return;
      }


    } catch (err) {
      console.error('[SORTEO ERROR]', err);
      await sock.sendMessage(message.key.remoteJid, { text: '❌ Ocurrió un error en el comando de sorteo.' });
    }
  }
};
