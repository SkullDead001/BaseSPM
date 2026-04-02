// ==================================================
// 👮 utils/esAdmin.js — ENTERPRISE EDITION
// SUPREM-TX BOT SYSTEM
// ==================================================

/* --------------------------------------------------
 * CACHE
 * jid => { admins: Set, expires }
 * -------------------------------------------------- */
const adminCache = new Map();

// TTL del cache (2 minutos)
const CACHE_TTL = 2 * 60 * 1000;

/* --------------------------------------------------
 * MAIN
 * -------------------------------------------------- */
async function esAdmin(sock, jid, message) {
  try {
    // Validaciones rápidas
    if (typeof jid !== 'string' || !jid.endsWith('@g.us')) return false;

    const sender =
      message?.key?.participant ||
      message?.key?.remoteJid;

    if (!sender || typeof sender !== 'string') return false;

    const now = Date.now();
    const cached = adminCache.get(jid);

    // Usar cache si es válido
    if (cached && cached.expires > now) {
      return cached.admins.has(sender);
    }

    // Obtener metadata (operación pesada)
    const metadata = await sock.groupMetadata(jid);

    // Construir set de admins
    const admins = new Set(
      metadata.participants
        .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
        .map(p => p.id)
    );

    // Guardar cache
    adminCache.set(jid, {
      admins,
      expires: now + CACHE_TTL
    });

    return admins.has(sender);

  } catch (err) {
    console.error('[esAdmin]', err.message);
    return false;
  }
}

module.exports = esAdmin;
