// src/utils/sessions.js

// Usar Map para evitar colisiones y mejorar rendimiento
const sessions = new Map();

// Tiempo máximo de vida de una sesión (10 minutos)
const SESSION_TTL = 10 * 60 * 1000;

/**
 * Inicia una sesión
 */
function startSession(jid, answer) {
  if (!jid) return;

  sessions.set(jid, {
    answer,
    attempts: 0,
    maxAttempts: 5,
    active: true,
    createdAt: Date.now()
  });
}

/**
 * Obtiene una sesión
 */
function getSession(jid) {
  if (!jid) return undefined;

  const session = sessions.get(jid);
  if (!session) return undefined;

  // Expirar sesiones viejas automáticamente
  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(jid);
    return undefined;
  }

  return session;
}

/**
 * Finaliza una sesión
 */
function endSession(jid) {
  if (!jid) return;
  sessions.delete(jid);
}

module.exports = {
  startSession,
  getSession,
  endSession
};
