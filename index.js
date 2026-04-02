/* ==================================================
   ARCHIVO: index.js
   PROYECTO: SUPREM-TX BOT SYSTEM
================================================== */

/* ==================================================
   1. CONFIGURACIÓN INICIAL /config
================================================== */
const path = require('path');
require('module').Module._initPaths();
const modPath = path.join(__dirname, 'config', 'node_modules');
require('module').globalPaths.push(modPath);

/* ==================================================
   2. DEPENDENCIAS NATIVAS
================================================== */
const fs = require('fs');
const os = require('os');

/* ==================================================
   3. DEPENDENCIAS EXTERNAS
================================================== */
require('dotenv').config();
const gradient = require('gradient-string');
const chalk = require('chalk');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

/* ==================================================
   4. BAILEYS
================================================== */
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

/* ==================================================
   5. MÓDULOS INTERNOS
================================================== */
const { db, guardarMensaje, contarMensajesPorJid } = require('./utils/db');
const { loadCommands, runCommand } = require('./utils/commandHandler');
const images = require('./utils/images.js');
const eventos = require('./utils/eventos.js');
const { checkAndDelete } = require('./utils/mute.js');

/* ==================================================
   6. RUTAS Y CONSTANTES
================================================== */
const configDir = path.join(__dirname, 'config');
const packagePath = path.join(configDir, 'package.json');
const comandosPath = path.join(__dirname, 'src/commands');
const sesionPath = path.join(__dirname, 'database');
const downloadsDir = path.join(__dirname, 'data/downloads');
const logsPath = path.join(__dirname, 'error/logs.txt');
const logFile = logsPath;
const noprivadoPath = path.join(__dirname, 'data/config/noprivado.json');

const TIEMPO_MIN_CONEXION = 10_000;
let ultimoIntentoConexion = 0;
const delay = (ms) => new Promise(r => setTimeout(r, ms));

/* ==================================================
   7. ESTADO GLOBAL
================================================== */
const startTime = Date.now();
let estadoConexion = 'close';
let qrPendiente = false;
let erroresRegistrados = 0;
let mensajesRecibidos = 0;
let gruposActivos = 0;
let comandosCargados = [];

const juegosActivos = new Map();
let bloqueoPrivado = { enabled: true };

const state = {
  activeDownloads: [],
  config: { DOWNLOADS_DIR: downloadsDir },
  db,
  sqlite: db,
  helpers: { guardarMensaje, contarMensajesPorJid }
};

async function saveState() { }

/* ==================================================
   8. PACKAGE INFO
================================================== */
if (fs.existsSync(packagePath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log(chalk.cyanBright(`\n🚀 Iniciando ${pkg.name || 'bot'} v${pkg.version || '1.0.0'}`));
  } catch {
    console.warn(chalk.red('⚠️ Error al leer config/package.json'));
  }
} else {
  console.warn(chalk.red('⚠️ No se encontró config/package.json'));
}

/* ==================================================
   9. VERIFICACIÓN DE ESTRUCTURA
================================================== */
const requiredDirs = [
  'config',
  'error',
  'database',
  'data/config',
  'data/downloads',
  'src/commands',
  'utils',
  'SQL'
];

for (const dir of requiredDirs) {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Carpeta creada automáticamente: ${dir}`);
  }
}

if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, '', 'utf8');
  console.log('🗒️ Archivo de logs creado automáticamente.');
}

if (fs.existsSync(noprivadoPath)) {
  try {
    bloqueoPrivado = JSON.parse(fs.readFileSync(noprivadoPath, 'utf8'));
  } catch {
    console.error(chalk.red('⚠️ Error al leer noprivado.json.'));
  }
} else {
  fs.writeFileSync(noprivadoPath, JSON.stringify(bloqueoPrivado, null, 2));
}

/* ==================================================
   10. PANEL PROFESIONAL
================================================== */
function generarBarraModern(valor, total) {
  const width = 28;
  const llenos = Math.round((valor / total) * width);
  return chalk.green("█".repeat(llenos)) + chalk.gray("░".repeat(width - llenos));
}

function mostrarPanelProfesional() {
  console.clear();

  const uptimeMs = Date.now() - startTime;
  const h = Math.floor(uptimeMs / 3600000);
  const m = Math.floor((uptimeMs % 3600000) / 60000);
  const s = Math.floor((uptimeMs % 60000) / 1000);
  const uptime = `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;

  const fecha = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });

  const estado =
    estadoConexion === "open"
      ? chalk.green("● ONLINE")
      : estadoConexion === "close"
      ? chalk.red("● OFFLINE")
      : chalk.yellow("● CONECTANDO");

  const cpuLoad = os.loadavg()[0].toFixed(2);
  const memoria = (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + " MB";
  const sistema = `${os.type()} ${os.release()} (${os.arch()})`;
  const nombreCarpeta = path.basename(process.cwd());

  let comandos = 0, utils = 0, deps = 0;
  try {
    if (fs.existsSync(comandosPath))
      comandos = fs.readdirSync(comandosPath).filter(f => f.endsWith(".js")).length;

    if (fs.existsSync(path.join(__dirname, "utils")))
      utils = fs.readdirSync(path.join(__dirname, "utils")).filter(f => f.endsWith(".js")).length;

    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    deps = Object.keys(pkg.dependencies || {}).length;
  } catch {}

  console.log(chalk.cyanBright("═══════════════════════════════════════════════════════"));
  console.log(chalk.whiteBright.bold(`           SUPREM-TX BOT SYSTEM  •  ${nombreCarpeta}`));
  console.log(chalk.gray("                       v1.0.0"));
  console.log(chalk.cyanBright("═══════════════════════════════════════════════════════"));

  console.log(chalk.gray(` Fecha/Hora:   ${chalk.white(fecha)}          Estado:  ${estado}`));
  console.log(chalk.gray(` Uptime:       ${chalk.green(uptime)}                  Sistema: ${chalk.white(sistema)}`));
  console.log(chalk.gray(` CPU Load:     ${chalk.yellow(cpuLoad)}                  Memoria: ${chalk.yellow(memoria)}`));
  console.log(chalk.cyanBright("───────────────────────────────────────────────────────"));
  console.log(chalk.gray(` Comandos:     ${chalk.magenta(comandos)}         Utils:      ${chalk.blueBright(utils)}`));
  console.log(chalk.gray(` Dependencias: ${chalk.cyan(deps)}         Mensajes:   ${chalk.yellow(mensajesRecibidos)}`));
  console.log(chalk.gray(` Grupos:       ${chalk.greenBright(gruposActivos)}         Errores:     ${chalk.red(erroresRegistrados)}`));
  console.log(chalk.cyanBright("───────────────────────────────────────────────────────"));

  const barra = generarBarraModern(mensajesRecibidos % 30, 30);
  console.log(chalk.gray(` Actividad:   ${barra}`));
  console.log(chalk.cyanBright("═══════════════════════════════════════════════════════"));
  console.log(chalk.gray("     Sistema en operación, monitoreando eventos...\n"));
}

global.mostrarPanelAvanzado = mostrarPanelProfesional;

/* ==================================================
   11. FUNCIÓN PRINCIPAL (COMPLETA E IDÉNTICA)
================================================== */
async function startBot() {
  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState(sesionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: authState,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Firefox', 'Linux', 'Ubuntu'],
      markOnlineOnConnect: false,
      syncFullHistory: false
    });

    const JuegosManager = require('./utils/Juegos.js');
    const games = new JuegosManager(sock, juegosActivos);

    if (!global.manualGroupChange) global.manualGroupChange = new Set();

    global.sock = sock;
    sock.ev.on('creds.update', saveCreds);

    const commands = loadCommands();
    comandosCargados = Array.from(commands.keys());

    mostrarPanelAvanzado();

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      estadoConexion = connection;
      qrPendiente = !!qr;

      if (qr) {
        console.clear();
        console.log(chalk.yellowBright('\n📲 Escanea este QR con WhatsApp:\n'));
        qrcode.generate(qr, { small: true });
        console.log(chalk.gray('\n⌛ QR válido durante 2 minutos...\n'));
      }

      if (connection === 'open') {
        estadoConexion = 'connecting';
        ultimoIntentoConexion = Date.now();
        await delay(10_000);
        estadoConexion = 'open';
        console.log(chalk.greenBright('\nConexión establecida de forma estable.'));
        const groups = await sock.groupFetchAllParticipating().catch(() => ({}));
        gruposActivos = Object.keys(groups).length;
        mostrarPanelAvanzado();
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = reason !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          const ahora = Date.now();
          const elapsed = ahora - ultimoIntentoConexion;
          const espera = Math.max(TIEMPO_MIN_CONEXION - elapsed, 0);

          console.log(chalk.yellow(`\n🔁 Reintentando conexión en ${(espera / 1000).toFixed(1)} segundos...`));
          await delay(espera);
          startBot();
        } else {
          console.log(chalk.red('\n❌ Sesión cerrada. Escanea un nuevo QR.'));
        }
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      try {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

const jid = msg.key.remoteJid;
if (await checkAndDelete(sock, msg)) return;

mensajesRecibidos++;
mostrarPanelAvanzado();

 if (!jid.endsWith("@g.us")) {

      const configPath = path.join(__dirname, "data/config/noprivado.json");

      let enabled = true;
      if (fs.existsSync(configPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(configPath, "utf8"));
          enabled = !!data.enabled;
        } catch {}
      }

      if (enabled) {
        await sock.sendMessage(jid, {
          image: { url: images.noprivado },
          caption: `* *⚠️ Aᴠɪsᴏ Sᴜᴘʀᴇᴍᴏ ⚠️*
> ᴘᴏʀ _sᴇɢᴜʀɪᴅᴀᴅ ᴅᴇʟ ɴᴜᴍᴇʀᴏ_ ʏ ᴅᴇʟ ʙᴏᴛ ᴍɪsᴍᴏ ᴛᴇ _ʙʟᴏᴏ̨ᴜᴇᴀʀᴇᴍᴏs_

> Esᴛᴏ ᴘᴀʀᴀ ᴇᴠɪᴛᴀʀ ᴇʟ _sᴘᴀᴍ ᴀʟ ᴘʀɪᴠᴀᴅᴏ_ ᴅᴇ ᴘᴇʀsᴏɴᴀs ᴄᴏɴ ᴍᴀʟᴀs ɪɴᴛᴇɴᴄɪᴏɴᴇs*
`
        });

        await delay(1200);

        try {
          await sock.updateBlockStatus(jid, "block");
          console.log("🚫 Usuario bloqueado:", jid);
        } catch (err) {
          console.log("Error bloqueando:", err.message);
        }

        return; // ⛔ IMPORTANTÍSIMO
      }
    }

    
async function safeBlockPrivate(sock, target) {
  try {
    if (!target.endsWith("@s.whatsapp.net")) return;
    if (target === sock.user?.id) return;
    if (msg.key.fromMe) return;

    await sock.updateBlockStatus(target, "block");
    console.log("🚫 Usuario bloqueado:", target.split("@")[0]);
  } catch (err) {
    console.error("Error bloqueando:", err.message);
  }
}

if (
  !jid.endsWith("@g.us") &&
  isNoPrivadoEnabled() &&
  !msg.key.fromMe
) {
await sock.sendMessage(jid, {
  image: { url: images.noprivado },
  caption: `* *⚠️ Hᴏʟᴀ ᴜsᴜᴀʀɪᴏ ⚠️*

> 🚫 Pᴏʀ ᴛᴇᴍᴀs ᴅᴇ sᴇɢᴜʀɪᴅᴀᴅ ᴛᴀɴᴛᴏ ᴅᴇʟ ɴᴜᴍᴇʀᴏ ʏ ᴅᴇʟ ʙᴏᴛ sᴇ ᴛᴇ ʙʟᴏᴏ̨ᴜᴇᴀʀᴀ ᴘᴀʀᴀ ᴇᴠɪᴛᴀʀ ᴘʀᴏʙʟᴇᴍᴀs
`
});

  await delay(800);
  await safeBlockPrivate(sock, jid);
  return;
}

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption;

        try {
          const sender = msg.key.participant || msg.key.remoteJid;
          guardarMensaje(jid, sender, text);
        } catch (err) {
          logError(err, "SQLite:guardarMensaje");
        }

        await runCommand(sock, msg, state, saveState, commands, games);

        if (global.awaitSetImage?.has(jid)) {
          const pending = global.awaitSetImage.get(jid);
          const imageMsg =
            msg.message?.imageMessage ||
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

          if (
            imageMsg &&
            pending.author === (msg.key.participant || jid) &&
            Date.now() <= pending.expires
          ) {
            const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
            try {
              const stream = await downloadContentFromMessage(imageMsg, 'image');
              let buffer = Buffer.from([]);
              for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

              const dir = path.join(__dirname, 'data', 'docs', jid);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

              const imgPath = path.join(dir, `${pending.name}.png`);
              fs.writeFileSync(imgPath, buffer);

              await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
              global.awaitSetImage.delete(jid);

            } catch (err) {
              console.error("Error guardando imagen del set:", err);
            }
          }
        }

        if (state.awaitEmoji && jid === state.awaitEmoji.jid && msg.message?.conversation) {
          const setEmojiCmd = commands.get('setemoji');
          if (setEmojiCmd) await setEmojiCmd.exec({ sock, message: msg, state });
        }

        if (global.modoNocheSelect && jid === global.modoNocheSelect.jid && msg.message?.conversation) {
          const texto = msg.message.conversation.trim();
          const args = [texto];
          const cmd = commands.get('modonoche');
          if (cmd) await cmd.exec({ sock, message: msg, args });
        }

        const handled = await games.procesarMensaje(msg);
        if (handled) return;

      } catch (err) {
        logError(err, 'messages.upsert');
      }
    });

    eventos(sock, {
      welcomePath: 'data/welcome',
      mutePath: 'data/mute',
      images,
      state,
      saveState,
      logError
    });

  } catch (err) {
    logError(err, 'startBot');
    console.log(chalk.red('❌ Error crítico, reintentando en 5 segundos...'));
    setTimeout(startBot, 5000);
  }
}

/* ==================================================
   12. ERRORES GLOBALES
================================================== */
function logError(error, origen = 'General') {
  const fechaMX = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  const msg = `\n[ERROR] ${fechaMX} | ${origen} -> ${error?.stack || error}`;

  console.log(chalk.redBright(msg));
  try {
    fs.appendFileSync('./logs.txt', msg + '\n', 'utf8');
  } catch (e) {
    console.error(chalk.red('⚠️ No se pudo guardar el log:'), e.message);
  }
}

process.on('uncaughtException', logError);
process.on('unhandledRejection', logError);

/* ==================================================
   13. BACKUP AUTOMÁTICO
================================================== */
const sessionBackup = path.join(__dirname, 'session_backup.zip');
setInterval(() => {
  try {
    require('child_process').execSync(`zip -r ${sessionBackup} database/`);
    console.log(chalk.green('💾 Sesión respaldada correctamente.'));
  } catch (err) {
    console.error(chalk.red('⚠️ Error al crear backup de sesión:'), err.message);
  }
}, 1000 * 60 * 60 * 12);

/* ==================================================
   INICIO
================================================== */
startBot();
