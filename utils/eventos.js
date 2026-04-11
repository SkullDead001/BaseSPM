// ========================================
// 🔧 Módulo de eventos principales del bot
// ========================================
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const esAdmin = require('../utils/admin');

// 🧠 Rutas y variables internas
const IMAGES_PATH = path.join(__dirname, '../utils/images.js');
const MEDIA_DIR = path.join(__dirname, '../media');



// ⚙️ Verificador de características activadas (bienvenida / despedida)
function checkFeature(jid, feature) {
  try {
    const filePath = path.join(__dirname, `../../data/config/${jid}/${feature}.json`);
    if (!fs.existsSync(filePath)) return true; // por defecto activado
    const state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return state.enabled !== false;
  } catch (err) {
    console.error('[CHECK FEATURE ERROR]', err.message);
    return true;
  }
}

// ========================================
// 🧩 Exportación principal
// ========================================
module.exports = function eventos(sock, { welcomePath, mutePath, images, state, saveState, logError }) {
  try {
    if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
  } catch (err) {
    logError(err, 'init-media-dir');
  }


  // ========================
  // 🔥 Módulo: setimg (Configuración de Imagen)
  // ========================

  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;
      const jid = msg.key.remoteJid;

      // Paso 1: Selección de opción
      if (state.pendingSetImg && state.pendingSetImg.step === "awaitOption" && jid === state.pendingSetImg.jid) {
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (text) {
          const num = parseInt(text.trim());
          if (!isNaN(num) && num > 0 && num <= state.pendingSetImg.opciones.length) {
            const opcion = state.pendingSetImg.opciones[num - 1];
            await sock.sendMessage(jid, { text: `**[ ⚙️ COMANDO ACTIVO ]**\n> *${opcion}*\n\n**[ 📥 CARGA DE ARCHIVO ]**\n> Eɴᴠɪᴀ ʟᴀ ɪᴍᴀɢᴇɴ ɴᴜᴇᴠᴀ (sᴏʟᴏ ɪᴍᴀɢᴇɴ)` });

            state.pendingSetImg = { step: "awaitImage", jid, opcion };
            return;
          } else {
            await sock.sendMessage(jid, { text: "**[ 🚨 ALERTA ]** Opción inválida. Usa un número válido de la lista." });
            return;
          }
        }
      }

      // Paso 2: Guardar imagen enviada (siempre en .png)
      if (state.pendingSetImg && state.pendingSetImg.step === "awaitImage" && jid === state.pendingSetImg.jid && msg.message.imageMessage) {
        const buffer = await downloadMediaMessage(msg, "buffer", {}, {
          logger: sock.logger,
          reuploadRequest: sock.updateMediaMessage
        });

        const fileName = `${state.pendingSetImg.opcion}.png`; // ⚙️ Formato forzado a PNG
        const savePath = path.join(MEDIA_DIR, fileName);

        // Sobrescribir archivo anterior
        fs.writeFileSync(savePath, buffer);

        // Reemplazar en images.js → apuntar al nuevo .png
        let fileContent = fs.readFileSync(IMAGES_PATH, 'utf8');
        const regex = new RegExp(`(${state.pendingSetImg.opcion}:\\s*path\\.join\\([^)]*['"]media['"],\\s*['"]).*?(['"])`, 'i');
        fileContent = fileContent.replace(regex, `$1${fileName}$2`);
        fs.writeFileSync(IMAGES_PATH, fileContent, 'utf8');

        await sock.sendMessage(jid, {
          text: `**[ 📌 ÉXITO ]**\nIᴍᴀɢᴇɴ _*${state.pendingSetImg.opcion}*_ ᴀᴄᴛᴜᴀʟɪᴢᴀᴅᴀ ᴄᴏɴ ᴇxɪᴛᴏ\n\n**[ 📂 RUTA DEL ARCHIVO ]**\n> sʀᴄ/ᴍᴇᴅɪᴀ`
        });

        state.pendingSetImg = null;
      }

    } catch (err) {
      logError(err);
    }
  });


global.groupUpdateCache ??= new Map();

sock.ev.on("groups.update", async (updates) => {
  try {
    for (const update of updates) {
      const { id, announce, author } = update;
      if (!id) continue;
      if (typeof announce === "undefined") continue;

      // 🚫 Ignorar modo noche
      if (global.manualGroupChange?.has(id)) continue;

      const lastState = global.groupUpdateCache.get(id);

      // 🧠 Si nunca lo hemos visto → solo guardar estado (NO avisar)
      if (lastState === undefined) {
        global.groupUpdateCache.set(id, announce);
        continue;
      }

      // 🚫 Si el estado no cambió → ignorar
      if (lastState === announce) continue;

      // 🧠 Guardar nuevo estado
      global.groupUpdateCache.set(id, announce);

      const actorTag = author ? `@${author.split("@")[0]}` : null;

      const texto = announce
        ? `*⚙️ Gʀᴜᴘᴏ Cᴇʀʀᴀᴅᴏ*

🔒 Solo admins pueden enviar mensajes.

${actorTag ? `• Realizado por: ${actorTag}` : ""}`
        : `*⚙️ Gʀᴜᴘᴏ Aʙɪᴇʀᴛᴏ*

🔓 Ahora todos pueden enviar mensajes.

${actorTag ? `• Realizado por: ${actorTag}` : ""}`;

      await sock.sendMessage(id, {
        text: texto.trim(),
        mentions: author ? [author] : []
      });
    }
  } catch (err) {
    console.error("Error en groups.update:", err);
  }
});



  //   PROMOVER / DEGRADAR ADMINISTRACION
  sock.ev.on("group-participants.update", async (update) => {
    try {
      const { id, participants, action, author } = update;

      // 🧩 Ignorar si fue provocado por un comando manual
      if (global.manualAdminChange && global.manualAdminChange.has(id)) {
        return;
      }

      if (!["promote", "demote"].includes(action)) return;
      if (!author) return;

      const authorId = typeof author === "string" ? author : author?.id || "";
      const authorTag = `@${authorId.split("@")[0]}`;

      for (const user of participants) {
        // ✅ Previene "user.split is not a function"
        const userId = typeof user === "string" ? user : user?.id || "";
        if (!userId) continue;

        const userTag = `@${userId.split("@")[0]}`;
        let texto;

        if (action === "promote") {
          texto = `
*👑 Nᴜᴇᴠᴏ Aᴅᴍɪɴ 👑*

> 🆙 ${userTag} ᴀʜᴏʀᴀ ᴇs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ.
*• Pᴏʀ:* ${authorTag}`;
        } else if (action === "demote") {
          texto = `
*🔻 Aᴅᴍɪɴ Dᴇɢʀᴀᴅᴀᴅᴏ 🔻*

> ⬇️ ${userTag} ʏᴀ ɴᴏ ᴇs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ.
*• Pᴏʀ:* ${authorTag}`;
        }

        await sock.sendMessage(id, {
          text: texto,
          mentions: [authorId, userId],
        });
      }
    } catch (err) {
      console.error("Error en promote/demote:", err);
    }
  });


  // ========================
  // ⚙️ Bienvenida y despedida (con toggle real + imagen)
  // ========================

  const bienvenidaEnviada = new Set();

  sock.ev.on("group-participants.update", async (update) => {
    try {
      const { id, participants, action } = update;
      // ============================================
// 🚨 VERIFICAR LISTA GLOBAL ANTES DE BIENVENIDA
// ============================================

if (action === "add") {
  await new Promise(r => setTimeout(r, 3000)); // ⏳ Delay 3 segundos

  const listaPath = path.join(process.cwd(), "data/ratas/numeros.json");

  if (fs.existsSync(listaPath)) {
    try {
      const lista = JSON.parse(fs.readFileSync(listaPath, "utf8"));

      const normalizar = (num) => {
  const soloDigitos = (num.match(/\d/g) || []).join("");

  // Si tiene más de 10 dígitos (ej +52), usar últimos 10
  if (soloDigitos.length > 10) {
    return soloDigitos.slice(-10);
  }

  return soloDigitos;
};
      const listaNormalizada = new Set(lista.map(normalizar));

      for (const participant of participants) {
        const userId =
          typeof participant === "string"
            ? participant
            : participant?.id || "";

        if (!userId) continue;

        const numero = userId.split("@")[0];
        const numeroNorm = normalizar(numero);

        if (listaNormalizada.has(numeroNorm)) {

          // 🚨 Enviar alerta
          await sock.sendMessage(id, {
            text:
`* *🚨 Aʟᴇʀᴛᴀ ᴅᴇ ɴᴜ́ᴍᴇʀᴏ ʀᴇɢɪꜱᴛʀᴀᴅᴏ 🚨*

* _👤 Uꜱᴜᴀʀɪᴏ_
> @${numero}

> 📛 Eꜱᴛᴇ ɴᴜ́ᴍᴇʀᴏ ᴇꜱᴛᴀ́ ᴇɴ ʟᴀ ʟɪꜱᴛᴀ ɢʟᴏʙᴀʟ
`,
            mentions: [userId]
          });

          return; // ❌ IMPORTANTE: cancela bienvenida
        }
      }
    } catch (err) {
      console.error("Error verificando lista:", err);
    }
  }
}
      if (!["add", "remove"].includes(action)) return;

      const tipo = action === "add" ? "bienvenida" : "despedida";

      // ===============================
      // 🔥 TOGGLE REAL — Lee JSON según acción
      // ===============================
      const configDir = path.join(__dirname, `../data/config/${id}`);
      const toggleFile = path.join(configDir, `${tipo}.json`);

      let enabled = true; // por defecto activado

      if (fs.existsSync(toggleFile)) {
        try {
          const json = JSON.parse(fs.readFileSync(toggleFile, "utf8"));
          enabled = json.enabled !== false;
        } catch (err) {
          console.error(`⚠️ Error leyendo ${tipo}.json:`, err);
        }
      }

      // ❌ Si la bienvenida/despedida está desactivada → no enviar nada
      if (!enabled) return;

      // ===============================
      // Meta del grupo
      // ===============================
      const groupMeta = await sock.groupMetadata(id);
      const miembros = groupMeta.participants.length;
      const descripcion = groupMeta.desc || "Sin descripción";

      const hora = new Date().toLocaleTimeString("es-MX", {
        timeZone: "America/Mexico_City",
      });

      for (const participant of participants) {
        const userId =
          typeof participant === "string" ? participant : participant?.id || "";
        if (!userId) continue;

        // Evitar spam de eventos duplicados
        const clave = `${id}_${userId}_${action}`;
        if (bienvenidaEnviada.has(clave)) return;
        bienvenidaEnviada.add(clave);
        setTimeout(() => bienvenidaEnviada.delete(clave), 30000);

        const userTag = `@${userId.split("@")[0]}`;
        const dir = path.join(welcomePath, id);

        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const filePath = path.join(dir, `${tipo}.txt`);

        let texto = "";

        // ===============================
        // Mensaje guardado por el usuario
        // ===============================
        if (fs.existsSync(filePath)) {
          texto = fs.readFileSync(filePath, "utf8");
          if (tipo === "bienvenida") {
            const leerMas = String.fromCharCode(8206).repeat(4000);
            texto += `\n\n${leerMas}\n\n${descripcion}`;
          }
        } else {
          // ===============================
          // Mensajes por defecto
          // ===============================
          if (tipo === "bienvenida") {
            const leerMas = String.fromCharCode(8206).repeat(4000);
            texto = `
╭─❰ *BᴏʙMᴀʀʟᴇʏ☽ Bᴏᴛ* ❱
│
├◈  👤 Bɪᴇɴᴠᴇɴɪᴅᴏ:
├ _${userTag}_
│
├◈  🕒 Hᴏʀᴀ ᴅᴇ Aᴄᴄᴇsᴏ:
├  _${hora}_
│
├◈  _Pᴀsᴀᴛᴇʟᴀ ʙɪᴇɴ ᴇɴ ɴᴜᴇsᴛʀᴏ ɢʀᴜᴘᴏ_
╰──ッ・👑・ッ─────────


> 📜 Lᴇᴇʀ Dᴇsᴄʀɪᴘᴄɪóɴ
${leerMas}
${descripcion}`;
          } else {
            texto = `
> *BᴏʙMᴀʀʟᴇʏ☽ Bᴏᴛ*

* ◈ 👤  ${userTag}
* ◈ 📉  ${miembros} ᴍɪᴇᴍʙʀᴏs

> *ᴜɴᴀ ᴘᴇʀsᴏɴᴀ ᴍᴇɴᴏs...*
`;
          }
        }

        // Sustituciones
        texto = texto
          .replace(/@user/g, userTag)
          .replace(/@hora/g, hora)
          .replace(/@miembros/g, miembros);

        // ===============================
        // Lectura de toggle de imágenes
        // ===============================
        const configPath = path.join(welcomePath, id, "images-config.json");
        let config = {};
        if (fs.existsSync(configPath)) {
          try {
            config = JSON.parse(fs.readFileSync(configPath, "utf8"));
          } catch (err) {
            console.error("Error leyendo images-config.json:", err);
          }
        }

        const imagenActiva = config[tipo]?.activo !== false;

        // ===============================
        // 📸 Envío final
        // ===============================
        if (imagenActiva) {
          let profilePic;
          try {
            profilePic = await sock.profilePictureUrl(userId, "image");
          } catch {
            profilePic = null;
          }

          const imgPath =
            profilePic ||
            (tipo === "bienvenida" ? images.bienvenida : images.despedida);

          await sock.sendMessage(id, {
            image: { url: imgPath },
            caption: texto.trim(),
            mentions: [userId],
          });
        } else {
          await sock.sendMessage(id, {
            text: texto.trim(),
            mentions: [userId],
          });
        }
      }
    } catch (err) {
      logError(err);
    }
  });

// ========================
// 🛡️ Antilink (MEJORADO)
// ========================
sock.ev.on("messages.upsert", async ({ messages }) => {
  const m = messages[0];
  if (!m.message) return;

  const from = m.key.remoteJid;

  // ✅ Solo grupos
  if (!from.includes("@g.us")) return;

  const sender = m.key.participant || from;

  // 📂 Ruta correcta global
  const filePath = path.join(process.cwd(), "data/antilink", `${from}.json`);

  if (!fs.existsSync(filePath)) {
    console.log("⚠️ No existe config antilink para este grupo");
    return;
  }

  const config = JSON.parse(fs.readFileSync(filePath));

  if (!config.enabled) return;

  const text =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    "";

  const linkRegex =
    /(https?:\/\/[^\s]+|www\.[^\s]+|chat\.whatsapp\.com\/[^\s]+)/gi;

  if (!linkRegex.test(text)) return;

  try {
    const groupMetadata = await sock.groupMetadata(from);
    const participants = groupMetadata.participants;
    const userData = participants.find((p) => p.id === sender);
    const isAdmin = userData?.admin;

    if (isAdmin === "admin" || isAdmin === "superadmin") return;

    // 🗑 Eliminar mensaje
    await sock.sendMessage(from, {
      delete: {
        remoteJid: m.key.remoteJid,
        fromMe: false,
        id: m.key.id,
        participant: m.key.participant,
      },
    });

    console.log("✅ Link eliminado");

    if (config.kick) {
      await sock.sendMessage(from, {
        text: `* *Sɪsᴛᴇᴍᴀ Aɴᴛɪʟɪɴᴋ ⚠️*

* _Usᴜᴀʀɪᴏ_
> @${sender.split("@")[0]}

* *Sᴇʀᴀs ᴇxᴘᴜʟsᴀᴅᴏ ᴘᴏʀ ᴇɴᴠɪᴀʀ ᴇɴʟᴀᴄᴇ*`,
        mentions: [sender],
      });

      await new Promise((r) => setTimeout(r, 2000));

      await sock.groupParticipantsUpdate(from, [sender], "remove");

      console.log("🚫 Usuario expulsado");
    }
  } catch (err) {
    console.log("❌ Error antilink:", err);
  }
});






  // 🔹 Carga de emojis personalizados
  function loadEmojis() {
    const emojiPath = path.join(__dirname, '../data/emojis.json');
    if (fs.existsSync(emojiPath)) {
      try {
        return JSON.parse(fs.readFileSync(emojiPath, 'utf8'));
      } catch {
        return { exito: '📌', error: '❌', advertencia: '⚠️', fuego: '🔥', admin: '👑' };
      }
    } else {
      return { exito: '📌', error: '❌', advertencia: '⚠️', fuego: '🔥', admin: '👑' };
    }
  }

  // 🔹 Evento principal
  module.exports = async (sock, message, state) => {
    const emojis = loadEmojis();

    try {
      const body = message.message?.conversation ||
        message.message?.extendedTextMessage?.text || '';
      if (!body) return;

      const prefix = '.'; // Cambia si usas sistema de prefijos
      if (!body.startsWith(prefix)) return;

      const args = body.slice(prefix.length).trim().split(/ +/);
      const cmdName = args.shift().toLowerCase();

      // Buscar el comando
      const commandFile = path.join(__dirname, 'commands', `${cmdName}.js`);
      if (fs.existsSync(commandFile)) {
        const command = require(commandFile);
        await command.exec({ sock, message, args, state, emojis });
      } else {
        await sock.sendMessage(message.key.remoteJid, {
          text: `${emojis.error} Comando no reconocido. Usa *.menu* para ver la lista.`,
        });
      }

    } catch (err) {
      console.error('[EVENTS ERROR]', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: `${loadEmojis().error} Ocurrió un error inesperado.`,
      });
    }
  };

  // === SISTEMA AUTOMÁTICO DE MODO NOCHE (SOLO CIERRE, SIN SPAM) ===

  setInterval(async () => {
    try {
      const baseDir = path.join(__dirname, "../data/modonoche");
      if (!fs.existsSync(baseDir)) return;

      const nowDate = new Date();
      const nowMX = new Date(
        nowDate.toLocaleString("en-US", { timeZone: "America/Mexico_City" })
      );
      const nowHours = nowMX.getHours();
      const nowMinutes = nowMX.getMinutes();
      const toleranceMinutes = 2; // margen de ±2 minutos
      const currentDate = nowMX.toISOString().split("T")[0]; // YYYY-MM-DD

      const files = fs.readdirSync(baseDir);

      for (const file of files) {
        const filePath = path.join(baseDir, file);
        const jid = file.replace(".json", "");
        let config;

        try {
          config = JSON.parse(fs.readFileSync(filePath, "utf8"));
        } catch {
          continue;
        }

        if (!config.activo) continue;

        const [h, m] = (config.inicio || "00:00").split(":").map(Number);
        const startMinutes = h * 60 + m;
        const nowTotal = nowHours * 60 + nowMinutes;

        // Si coincide la hora dentro del margen permitido
        if (Math.abs(nowTotal - startMinutes) <= toleranceMinutes) {
          // Evita ejecutar si ya se cerró hoy
          if (config.lastClosed === currentDate) continue;

          // 📌 Ejecutar cierre automático solo una vez al día
          await global.sock.groupSettingUpdate(jid, "announcement");
          await global.sock.sendMessage(jid, {
          });

          // Guardar fecha de último cierre para evitar spam
          config.lastClosed = currentDate;
          fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
        }
      }
    } catch (err) {
      console.error("[AUTO MODO NOCHE ERROR]", err);
    }
  }, 60000);


  // === SISTEMA DE EDIT EMOJIS ===
  function loadEmojis() {
    const emojiPath = path.join(__dirname, "../../src/json/emojis.json");
    if (fs.existsSync(emojiPath)) {
      return JSON.parse(fs.readFileSync(emojiPath, "utf8"));
    }
    return {};
  }

  module.exports = {
    reaccion: async (sock, message, tipo) => {
      const emojis = loadEmojis();
      let emoji = emojis[tipo] || "⚙️";
      await sock.sendMessage(message.key.remoteJid, {
        react: { text: emoji, key: message.key },
      });
    },
  };

  // ========================
  // ⚔️ Bloquear privados automáticamente (.noprivado on/off)
  // ========================
  const noprivadoConfigPath = path.join(process.cwd(), "data/config/noprivado.json");

  // Crear carpeta y archivo si no existen
  if (!fs.existsSync(path.dirname(noprivadoConfigPath))) {
    fs.mkdirSync(path.dirname(noprivadoConfigPath), { recursive: true });
  }
  if (!fs.existsSync(noprivadoConfigPath)) {
    fs.writeFileSync(noprivadoConfigPath, JSON.stringify({ enabled: true }, null, 2));
  }

  // Escucha todos los mensajes entrantes
  sock.ev.on("messages.upsert", async (m) => {
    try {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const jid = msg.key.remoteJid;
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      // ========================
      // ⚙️ Comando .noprivado
      // ========================
      if (text.startsWith(".noprivado")) {
        const sender = msg.key.participant || msg.key.remoteJid;
        const senderId = sender.split("@")[0];
        const isOwner = global.owner && global.owner.includes(senderId);
        let isAdmin = false;

        if (jid.endsWith("@g.us")) {
          isAdmin = await esAdmin(sock, jid, sender);
        }

        // Solo admin u owner puede ejecutar
        if (!isOwner && !isAdmin) {
          await sock.sendMessage(jid, { react: { text: "⚠️", key: msg.key } });
          return;
        }

        const arg = text.split(" ")[1]?.toLowerCase();
        if (!arg) return;

        const enabled =
          arg === "on" || arg === "activar" || arg === "encender";

        if (["on", "off", "activar", "desactivar", "encender", "apagar"].includes(arg)) {
          fs.writeFileSync(
            noprivadoConfigPath,
            JSON.stringify({ enabled }, null, 2)
          );

          await sock.sendMessage(jid, {
            react: { text: enabled ? "✅" : "🟠", key: msg.key },
          });
          return;
        }
      }


    } catch (err) {
      logError(err);
    }
  });
}
