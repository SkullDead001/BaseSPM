// ==================================================
// 📦 utils/db.js — ENTERPRISE EDITION
// SUPREM-TX BOT SYSTEM
// ==================================================

/* --------------------------------------------------
 * CORE
 * -------------------------------------------------- */
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

/* --------------------------------------------------
 * PATHS
 * -------------------------------------------------- */
const SQL_DIR = path.join(__dirname, '..', 'SQL');
const DB_PATH = path.join(SQL_DIR, 'bot.sqlite');

/* --------------------------------------------------
 * INIT DIR
 * -------------------------------------------------- */
if (!fs.existsSync(SQL_DIR)) {
  fs.mkdirSync(SQL_DIR, { recursive: true });
}

/* --------------------------------------------------
 * OPEN DB
 * -------------------------------------------------- */
const db = new Database(DB_PATH, {
  timeout: 5000,          // evita "database is locked"
  fileMustExist: false
});

/* --------------------------------------------------
 * PRAGMAS (ENTERPRISE)
 * -------------------------------------------------- */
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('temp_store = MEMORY');
db.pragma('cache_size = -64000'); // ~64MB cache

/* --------------------------------------------------
 * SCHEMA
 * -------------------------------------------------- */
db.exec(`
  CREATE TABLE IF NOT EXISTS mensajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grupo TEXT NOT NULL,
    autor TEXT NOT NULL,
    texto TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_mensajes_grupo
  ON mensajes(grupo);
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_mensajes_grupo_fecha
  ON mensajes(grupo, created_at);
`);

/* --------------------------------------------------
 * PREPARED STATEMENTS (CLAVE)
 * -------------------------------------------------- */
const stmtInsertMensaje = db.prepare(`
  INSERT INTO mensajes (grupo, autor, texto)
  VALUES (?, ?, ?)
`);

const stmtCountByGrupo = db.prepare(`
  SELECT COUNT(*) AS total
  FROM mensajes
  WHERE grupo = ?
`);

/* --------------------------------------------------
 * HELPERS
 * -------------------------------------------------- */

/**
 * Guarda un mensaje en SQLite
 * Ultra rápido (statement reutilizado)
 */
function guardarMensaje(grupo, autor, texto = '') {
  try {
    stmtInsertMensaje.run(grupo, autor, texto);
  } catch (err) {
    console.error('[DB guardarMensaje]', err.message);
  }
}

/**
 * Cuenta mensajes por JID
 */
function contarMensajesPorJid(jid) {
  try {
    return stmtCountByGrupo.get(jid) || { total: 0 };
  } catch (err) {
    console.error('[DB contarMensajesPorJid]', err.message);
    return { total: 0 };
  }
}

/* --------------------------------------------------
 * EXPORTS
 * -------------------------------------------------- */
module.exports = {
  db,
  guardarMensaje,
  contarMensajesPorJid
};
