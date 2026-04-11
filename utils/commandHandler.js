// ==================================================
// 📦 commandHandler.js — ENTERPRISE EDITION
// SUPREM-TX BOT SYSTEM
// ==================================================

/* --------------------------------------------------
 * CORE
 * -------------------------------------------------- */
const fs = require('fs');
const path = require('path');

/* --------------------------------------------------
 * CONSTANTES
 * -------------------------------------------------- */
const COMMAND_PREFIX = '.';
const COOLDOWN_MS = 2000;

/* --------------------------------------------------
 * PATHS
 * -------------------------------------------------- */
const ROOT = process.cwd();


const PATHS = {
  commands: path.join(ROOT, 'src/commands'),
  botConfigDir: path.join(ROOT, 'data/config'),
  botStatus: path.join(ROOT, 'data/config/bot-status.json'),
  docs: path.join(ROOT, 'data/docs')
};

/* --------------------------------------------------
 * CACHE & COLAS
 * -------------------------------------------------- */
const sendQueue = new Map();        // jid => Promise
const cooldowns = new Map();        // sender:cmd => timestamp
const commandsCache = new Map();    // name => command
const onMessageHandlers = new Set();// unique handlers

let botEnabledCache = true;

/* --------------------------------------------------
 * BOT STATUS (CACHE + WATCH)
 * -------------------------------------------------- */
function loadBotStatusOnce() {
  try {
    if (!fs.existsSync(PATHS.botStatus)) return true;
    const json = JSON.parse(fs.readFileSync(PATHS.botStatus, 'utf8'));
    return json.enabled !== false;
  } catch {
    return true;
  }
}

botEnabledCache = loadBotStatusOnce();

// Watcher ENTERPRISE (sin releer por comando)
try {
  fs.watch(PATHS.botStatus, () => {
    botEnabledCache = loadBotStatusOnce();
  });
} catch {}

/* --------------------------------------------------
 * SAVE BOT STATUS
 * -------------------------------------------------- */
function saveBotStatus(enabled) {
  try {
    if (!fs.existsSync(PATHS.botConfigDir)) {
      fs.mkdirSync(PATHS.botConfigDir, { recursive: true });
    }

    fs.writeFileSync(
      PATHS.botStatus,
      JSON.stringify({ enabled: !!enabled }, null, 2),
      'utf8'
    );

    botEnabledCache = !!enabled;
  } catch (err) {
    console.error('[BotStatusSaveError]', err);
  }
}

/* --------------------------------------------------
 * SEND SAFE (COLA LIMPIA)
 * -------------------------------------------------- */
async function sendSafe(sock, jid, message) {
  const prev = sendQueue.get(jid) || Promise.resolve();

  const next = prev
    .then(() => sock.sendMessage(jid, message))
    .catch(err => console.error('[sendSafe]', err))
    .finally(() => {
      if (sendQueue.get(jid) === next) {
        sendQueue.delete(jid);
      }
    });

  sendQueue.set(jid, next);
  return next;
}

/* --------------------------------------------------
 * TYPING SIMULATION
 * -------------------------------------------------- */
async function simulateTyping(sock, jid, callback) {
  try {
    await sock.sendPresenceUpdate('composing', jid);
    await new Promise(r => setTimeout(r, 900));
    await callback();
    await sock.sendPresenceUpdate('paused', jid);
  } catch (err) {
    console.error('[TypingSimulation]', err);
  }
}

/* --------------------------------------------------
 * LOAD COMMANDS (CACHE)
 * -------------------------------------------------- */
function loadCommands(dir = PATHS.commands) {
  if (commandsCache.size) return commandsCache;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);

    if (fs.lstatSync(fullPath).isDirectory()) {
      loadCommands(fullPath);
      continue;
    }

    if (!file.endsWith('.js')) continue;

    try {
      const cmd = require(fullPath);

      if (cmd?.name && typeof cmd.exec === 'function') {
        commandsCache.set(cmd.name, cmd);

        if (Array.isArray(cmd.alias)) {
          cmd.alias.forEach(a => commandsCache.set(a, cmd));
        }

        if (typeof cmd.onMessage === 'function') {
          onMessageHandlers.add(cmd.onMessage);
        }
      }
    } catch (err) {
      console.error(`[CommandLoadError:${file}]`, err);
    }
  }

  return commandsCache;
}

/* --------------------------------------------------
 * DYNAMIC FILES
 * -------------------------------------------------- */
function saveDynamicFile(jid, name, content) {
  const dir = path.join(PATHS.docs, jid);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.txt`), content, 'utf8');
}

function readDynamicFile(jid, name) {
  const file = path.join(PATHS.docs, jid, `${name}.txt`);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8').trim() || null;
}

/* --------------------------------------------------
 * GROUP ADMIN CHECK
 * -------------------------------------------------- */
function isAdminOrSuperadmin(metadata, sender) {
  const p = metadata.participants.find(x => x.id === sender);
  return p?.admin === 'admin' || p?.admin === 'superadmin';
}

/* --------------------------------------------------
 * MAIN COMMAND HANDLER
 * -------------------------------------------------- */
async function runCommand(sock, msg, state, saveState, commands, games) {
  try {

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      '';

    const sticker =
      msg.message?.stickerMessage ||
      msg.message?.ephemeralMessage?.message?.stickerMessage;

    // ❌ Si no es comando ni sticker → salir
    if (!text.startsWith(COMMAND_PREFIX) && !sticker) {
      return;
    }

    // ---------------- STICKER COMMANDS ----------------
    if (sticker) {
      for (const command of commands.values()) {
        if (command?.stickerOnly === true) {
          await command.exec({
            sock,
            message: msg,
            state,
            saveState,
            sendSafe,
            games,
            db: state.db,
            sqlite: state.sqlite,
            helpers: state.helpers
          });
        }
      }
    }

    if (!text.startsWith(COMMAND_PREFIX)) return;

    const args = text.slice(1).trim().split(/\s+/);
    const cmdName = args.shift().toLowerCase();

    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || jid;
    const isOwner = msg.key.fromMe === true;

    /* ---------------- BOT ON / OFF ---------------- */
    if (cmdName === 'botoff' || cmdName === 'boton') {
      if (!isOwner) {
        await sendSafe(sock, jid, { text: '⚠️ Solo el *owner* puede usar este comando.' });
        return;
      }

      const wantEnable = cmdName === 'boton';
      if (wantEnable === botEnabledCache) {
        await sendSafe(sock, jid, {
          text: wantEnable
            ? '✅ El bot ya está activo.'
            : '✅ El bot ya está apagado.'
        });
        return;
      }

      saveBotStatus(wantEnable);

      await sendSafe(sock, jid, {
        text: wantEnable
          ? '✅ *Sistema reactivado*'
          : '⛔ *Sistema apagado*\n> Usa *.boton* para reactivar.'
      });

      return;
    }

    if (!botEnabledCache) return;

    /* ---------------- COOLDOWN ---------------- */
    const now = Date.now();
    const cdKey = `${sender}:${cmdName}`;
    const last = cooldowns.get(cdKey);

    if (last && now - last < COOLDOWN_MS) {
      await sendSafe(sock, jid, {
        text: `⏳ Espera ${((COOLDOWN_MS - (now - last)) / 1000).toFixed(1)}s.`
      });
      return;
    }

    cooldowns.set(cdKey, now);
    setTimeout(() => cooldowns.delete(cdKey), COOLDOWN_MS);

/* ---------------- NORMAL COMMAND ---------------- */
let command = commands.get(cmdName);

// 🔥 Soporte para .setcualquiercosa
if (!command && cmdName.startsWith("set")) {
  command = commands.get("set");
}

if (command) {
  await simulateTyping(sock, jid, async () => {
    await command.exec({
      sock,
      message: msg,
      args,
      state,
      saveState,
      sendSafe,
      games,
      db: state.db,
      sqlite: state.sqlite,
      helpers: state.helpers
    });
  });
  return;
}


    /* ---------------- DYNAMIC FILE ---------------- */
/* ---------------- DYNAMIC FILE ---------------- */
const dynamic = readDynamicFile(jid, cmdName);

if (dynamic) {
  const dir = path.join(PATHS.docs, jid);
  const imagePath = path.join(dir, `${cmdName}.png`);

  await simulateTyping(sock, jid, async () => {

    // 🖼 Si existe imagen → enviar imagen + texto
    if (fs.existsSync(imagePath)) {
      await sock.sendMessage(jid, {
        image: { url: imagePath },
        caption: dynamic
      });
    } 
    // 📄 Si no existe → solo texto
    else {
      await sock.sendMessage(jid, {
        text: dynamic
      });
    }

  });

  return;
}

    /* ---------------- onMessage GLOBAL ---------------- */
    for (const fn of onMessageHandlers) {
      try {
        await fn(sock, msg, state, saveState);
      } catch (err) {
        console.error('[onMessage]', err);
      }
    }

  } catch (err) {
    console.error('[CommandHandler]', err);
    if (msg?.key?.remoteJid) {
      await sendSafe(sock, msg.key.remoteJid, {
        text: '❌ Error al ejecutar el comando.'
      });
    }
  }
}


/* --------------------------------------------------
 * EXPORTS
 * -------------------------------------------------- */
module.exports = {
  loadCommands,
  runCommand,
  sendSafe
};
