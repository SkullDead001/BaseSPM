// ===============================================================
// 🔫 Dᴜᴇʟᴏ ᴅᴇ Rᴇᴀᴄᴄɪᴏ́ɴ – 1vs1 (con límite de 5 segundos)
// ===============================================================

const duelos = new Map(); // partidas activas por grupo

// Generar palabra/patrón aleatorio
function generarReto() {
  const opciones = [
    () => Math.random().toString(36).substring(2, 6).toUpperCase(),  // 4 letras/números
    () => String(Math.floor(1000 + Math.random() * 9000)),          // 4 dígitos
    () => ["🔥", "⚡", "💀", "🎯", "🐍", "👑"][Math.floor(Math.random() * 6)],
    () => ["K92X", "R-77", "XP-09", "Z42X", "LM88"][Math.floor(Math.random() * 5)]
  ];
  const generator = opciones[Math.floor(Math.random() * opciones.length)];
  return generator();
}

module.exports = {
  name: "duelo",
  alias: ["duel", "reto1v1"],
  description: "Inicia un duelo de reacción 1v1",
  noCooldown: true,


  exec: async ({ sock, message }) => {
    try {
      const jid = message.key.remoteJid;
      if (!jid.endsWith("@g.us")) return;

      // Si ya hay duelo
      if (duelos.has(jid)) {
        await sock.sendMessage(jid, {
          text: "⚠️ Ya hay un duelo activo en este grupo.",
        });
        return;
      }

      const sender = message.key.participant;
      const ctx = message.message?.extendedTextMessage?.contextInfo || {};
      const mencionado = ctx.mentionedJid?.[0] || ctx.participant;

      if (!mencionado) {
        await sock.sendMessage(jid, {
          text: "⚠️ Debes mencionar a la persona que deseas retar.\nEjemplo:\n> .duelo @usuario",
        });
        return;
      }

      if (mencionado === sender) {
        await sock.sendMessage(jid, {
          text: "😅 No puedes competir contra ti mismo.",
        });
        return;
      }

      if (mencionado === sock.user.id) {
        await sock.sendMessage(jid, {
          text: "🤖 Yo no juego duelos, elige a un humano.",
        });
        return;
      }

      // Crear partida
      const duelo = {
        jugadores: [sender, mencionado],
        activo: true,
        objetivo: null,
        timeout: null,  // tiempo límite
      };

      duelos.set(jid, duelo);

      await sock.sendMessage(jid, {
        text:
          `🔫 *Duelo de reacción iniciado*\n\n` +
          `👤 Retador: @${sender.split("@")[0]}\n` +
          `🎯 Oponente: @${mencionado.split("@")[0]}\n\n` +
          `> Esperen la señal...`,
        mentions: duelo.jugadores,
      });

      // Tiempo aleatorio antes de la señal
      const delay = 2000 + Math.random() * 5000;

      setTimeout(async () => {
        if (!duelos.has(jid)) return;

        duelo.objetivo = generarReto();

        await sock.sendMessage(jid, {
          text:
            `⚡ *¡YA!* ⚡\n\n` +
            `Escribe exactamente:\n\n👉  *${duelo.objetivo}*\n\n` +
            `⏳ *Tienes 5 segundos...*`
        });

        // ░░░ TIEMPO LÍMITE DE 5 SEGUNDOS ░░░
        duelo.timeout = setTimeout(async () => {
          if (!duelos.has(jid)) return;

          // Nadie ganó → cancelar duelo
          duelos.delete(jid);

          await sock.sendMessage(jid, {
            text:
              `⏳ *Tiempo agotado*\n` +
              `Nadie escribió: *${duelo.objetivo}*\n\n` +
              `> Duelo finalizado.`,
          });

        }, 5000);

      }, delay);

    } catch (err) {
      console.error("[DUEL START ERROR]", err);
    }
  },

  // =====================================
  // onMessage → detectar quién gana
  // =====================================
  onMessage: async (sock, msg) => {
    try {
      const jid = msg.key.remoteJid;
      if (!duelos.has(jid)) return;

      const duelo = duelos.get(jid);
      if (!duelo.activo) return;

      const sender = msg.key.participant;

      // Solo participantes válidos
      if (!duelo.jugadores.includes(sender)) return;

      const body =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "";

      if (!body || !duelo.objetivo) return;

      // Texto exacto
      if (body.trim() === duelo.objetivo) {
        duelo.activo = false;

        // Cancela el timeout
        clearTimeout(duelo.timeout);
        duelos.delete(jid);

        await sock.sendMessage(jid, {
          text:
            `🏆 *¡Reacción perfecta!* 🏆\n\n` +
            `Ganador: @${sender.split("@")[0]}\n` +
            `👉 Reto correcto: *${duelo.objetivo}*`,
          mentions: duelo.jugadores,
        });
      }
    } catch (err) {
      console.error("[DUEL MESSAGE ERROR]", err);
    }
  },
};
