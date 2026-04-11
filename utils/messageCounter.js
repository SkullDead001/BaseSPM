const fs = require('fs');
const path = require('path');

const countsDir = path.join(__dirname, '../../data/messageCounts');
if (!fs.existsSync(countsDir)) fs.mkdirSync(countsDir, { recursive: true });

/* --------------------------------------------------
 * CACHE EN MEMORIA
 * key = `${jid}:${sender}`
 * -------------------------------------------------- */
const cache = new Map();

/* --------------------------------------------------
 * CONFIG
 * -------------------------------------------------- */
const FLUSH_INTERVAL = 10_000; // guardar cada 10s
const MAX_CACHE_SIZE = 10_000;

/* --------------------------------------------------
 * FLUSH A DISCO
 * -------------------------------------------------- */
function flushToDisk() {
  try {
    for (const [key, data] of cache.entries()) {
      const [jid, sender] = key.split(':');

      const groupDir = path.join(countsDir, jid);
      if (!fs.existsSync(groupDir)) fs.mkdirSync(groupDir, { recursive: true });

      const userFile = path.join(groupDir, `${sender}.json`);
      fs.writeFileSync(userFile, JSON.stringify({ count: data.count }, null, 2));
    }
  } catch (err) {
    console.error('[MessageCounter FLUSH ERROR]', err);
  }
}

/* --------------------------------------------------
 * AUTO FLUSH
 * -------------------------------------------------- */
setInterval(flushToDisk, FLUSH_INTERVAL);

/* --------------------------------------------------
 * MAIN
 * -------------------------------------------------- */
async function contarMensaje(message) {
  try {
    if (!message?.key?.remoteJid) return;

    const jid = message.key.remoteJid;
    if (!jid.endsWith('@g.us')) return;

    const sender = message.key.participant || jid;
    if (!sender) return;

    const key = `${jid}:${sender}`;
    let entry = cache.get(key);

    if (!entry) {
      // Cargar desde disco una sola vez
      let count = 0;
      const filePath = path.join(countsDir, jid, `${sender}.json`);

      if (fs.existsSync(filePath)) {
        try {
          const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          count = json.count || 0;
        } catch {}
      }

      entry = { count };
      cache.set(key, entry);

      // Evitar crecimiento infinito
      if (cache.size > MAX_CACHE_SIZE) {
        flushToDisk();
        cache.clear();
      }
    }

    entry.count += 1;

  } catch (err) {
    console.error('[MessageCounter ERROR]', err);
  }
}

module.exports = { contarMensaje };
