const esAdmin = require('../../utils/admin');

const cooldowns = new Map();

// =======================================================
// 🕒 Soporta: 10s, 5m, 2h, 3d, combinaciones: 1h 20m, 2d 4h…
// =======================================================

module.exports = {
    name: 'cerrar',
    alias: ['abrir'],
    description: 'Programa el cierre o la apertura del grupo después de un tiempo (hora México)',
    noCooldown: true,

    exec: async ({ sock, message, args }) => {
        try {
            const jid = message.key.remoteJid;
            const sender = message.key.participant || jid;
            if (!jid.endsWith('@g.us')) return;

            // Antispam
            const key = `${jid}:${sender}:timer-grupo`;
            const now = Date.now();
            if (cooldowns.has(key) && now - cooldowns.get(key) < 3000) return;
            cooldowns.set(key, now);

            // Admin check
            const admin = await esAdmin(sock, jid, message);
            if (!admin && !message.key.fromMe) return;

            const rawText =
                message.message?.conversation ||
                message.message?.extendedTextMessage?.text ||
                '';

            const comando = rawText.trim().split(' ')[0].replace('.', '').toLowerCase();
            const esCerrar = comando === 'cerrar';

            // ============================================
            // 🧮 Parsear múltiples tiempos: 1h 30m 10s 2d
            // ============================================
            if (!args.length) return;

            let totalMs = 0;

            for (const t of args) {
                const match = t.match(/^(\d+)([smhd])$/i);
                if (!match) continue;

                const num = parseInt(match[1], 10);
                const unit = match[2].toLowerCase();

                if (unit === 's') totalMs += num * 1000;
                if (unit === 'm') totalMs += num * 60 * 1000;
                if (unit === 'h') totalMs += num * 60 * 60 * 1000;
                if (unit === 'd') totalMs += num * 24 * 60 * 60 * 1000;
            }

            if (!totalMs || totalMs <= 0) return;

            // ============================================
            // 🕓 Convertir a hora México
            // ============================================
            const timeZone = 'America/Mexico_City';
            const ahoraMX = new Date(
                new Date().toLocaleString('en-US', { timeZone })
            );
            const ejecucionMX = new Date(ahoraMX.getTime() + totalMs);
            const horaEjecucion = ejecucionMX.toLocaleTimeString('es-MX', {
                timeZone,
                hour12: false,
            });

            // ============================================
            // 🟢 TU TEXTO ORIGINAL — NO TOCADO
            // ============================================
            await sock.sendMessage(jid, {
                text: `* Oʀᴅᴇɴ ʀᴇᴄɪʙɪᴅᴀ ✅\n> ⏲️ Eʟ ɢʀᴜᴘᴏ sᴇ ${
                    esCerrar ? 'ᴄᴇʀʀᴀʀᴀ́' : 'ᴀʙʀɪʀᴀ́'
                } ᴇɴ ${args.join(" ")}` // ← usa tus args originales
            });

            // ============================================
            // 🔥 Ejecutar la acción
            // ============================================
            setTimeout(async () => {
                try {
                    await sock.groupSettingUpdate(
                        jid,
                        esCerrar ? 'announcement' : 'not_announcement'
                    );
                } catch (e) {
                    console.error('[GRUPO TIMER ERROR]', e);
                }
            }, totalMs);

        } catch (err) {
            console.error('[GRUPO TIMER COMMAND ERROR]', err);
        }
    },
};
