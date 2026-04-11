// src/utils/mute.js
const fs = require('fs');
const path = require('path');

// 📁 Carpeta: <root>/data/mute
const rootDir = path.join(__dirname, '..', '..');
const mutePath = path.join(rootDir, 'data', 'mute');
if (!fs.existsSync(mutePath)) fs.mkdirSync(mutePath, { recursive: true });

// ========================================
// 🔧 Helpers (NO visibles)
// ========================================
const normalizeJid = (jid) => (jid || '').split(':')[0].toLowerCase();

// Cache en memoria
// key: jid normalizado
// value: Set de usuarios muteados
const muteCache = new Map();

function readJson(file) {
  if (!fs.existsSync(file)) return [];
  try {
    const txt = fs.readFileSync(file, 'utf8');
    if (!txt.trim()) return [];
    return JSON.parse(txt);
  } catch {
    return [];
  }
}

// Escritura atómica (NO se toca)
function writeJson(file, data) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

// ========================================
// 🔧 Core
// ========================================
function getMuted(jid) {
  const group = normalizeJid(jid);

  // Cache hit
  const cached = muteCache.get(group);
  if (cached) return Array.from(cached);

  const file = path.join(mutePath, `${group}.json`);
  const list = readJson(file).map(normalizeJid);

  const set = new Set(list);
  muteCache.set(group, set);

  return list;
}

function addMute(jid, user) {
  const group = normalizeJid(jid);
  const u = normalizeJid(user);

  const current = new Set(getMuted(group));
  current.add(u);

  const file = path.join(mutePath, `${group}.json`);
  writeJson(file, Array.from(current));

  // 🔄 actualizar cache
  muteCache.set(group, current);
}

function removeMute(jid, user) {
  const group = normalizeJid(jid);
  const u = normalizeJid(user);

  const filtered = getMuted(group).filter(x => x !== u);
  const set = new Set(filtered);

  const file = path.join(mutePath, `${group}.json`);
  writeJson(file, filtered);

  // 🔄 actualizar cache
  muteCache.set(group, set);
}

function isMuted(jid, user) {
  const group = normalizeJid(jid);
  const u = normalizeJid(user);

  const set = muteCache.get(group);
  if (set) return set.has(u);

  return getMuted(group).includes(u);
}

// 💣 Si el remitente está muteado, borra el mensaje
async function checkAndDelete(sock, msg) {
  try {
    const jid = msg?.key?.remoteJid;
    if (!jid) return false;

    const senderRaw = msg?.key?.participant || msg?.key?.remoteJid;
    const sender = normalizeJid(senderRaw);

    if (isMuted(jid, sender)) {
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

module.exports = {
  getMuted,
  addMute,
  removeMute,
  isMuted,
  checkAndDelete
};
