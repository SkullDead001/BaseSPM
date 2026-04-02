const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const esAdmin = require("../../utils/admin");

const cooldowns = new Map();
const saveDir = path.join(__dirname, "../../data/automsg");
if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

module.exports = {
  name: "automsg",
  alias: ["mass", "auto", "spam"],
  description: "Envía varios mensajes automáticos o banners a múltiples grupos. Ahora recuerda la última configuración.",
  noCooldown: true,

  exec: async ({ sock, message }) => {
    const jid = message.key.remoteJid;
    const sender = message.key.participant || jid;

    try {
      if (!jid.endsWith("@g.us")) return;

      // 🚫 Antispam global
      const key = `${jid}:${sender}:automsg`;
      const now = Date.now();
      if (cooldowns.has(key) && now - cooldowns.get(key) < 60000) {
        await sock.sendMessage(jid, { text: "⚠️ Espera un minuto antes de repetir el comando." });
        return;
      }
      cooldowns.set(key, now);

      // 👑 Solo admin o dueño
      const admin = await esAdmin(sock, jid, message);
      if (!admin && !message.key.fromMe) {
        await sock.sendMessage(jid, { react: { text: "⚠️", key: message.key } });
        return;
      }

      // 📁 Ruta de guardado
      const configPath = path.join(saveDir, `${sender.replace(/[:@]/g, "_")}.json`);

      // 🧠 Comando especial: .automsg reenviar
      const body =
        message.message.conversation ||
        message.message.extendedTextMessage?.text ||
        "";
      if (/reenviar|repetir|último/i.test(body)) {
        if (!fs.existsSync(configPath)) {
          await sock.sendMessage(jid, { text: "⚠️ No hay mensajes automáticos guardados para reenviar." });
          return;
        }

        const lastConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
        await sock.sendMessage(jid, { text: "♻️ Reenviando los últimos mensajes automáticos guardados..." });
        await ejecutarEnvio(sock, jid, lastConfig);
        return;
      }

      // 🖼️ Paso 1️⃣: Número de banners
      await sock.sendMessage(jid, { text: "🖼️ ¿Cuántos mensajes o banners deseas enviar? (1–10)" });
      let cantidad = parseInt(await esperarRespuesta(sock, jid, sender));
      if (isNaN(cantidad) || cantidad < 1 || cantidad > 10) cantidad = 1;

      const mensajes = [];

      // 🧩 Paso 2️⃣: Configurar banners
      for (let i = 1; i <= cantidad; i++) {
        await sock.sendMessage(jid, {
          text: `📢 *Mensaje #${i}*\n1️⃣ Solo texto\n2️⃣ Solo imagen\n3️⃣ Imagen + texto`,
        });
        const tipo = await esperarRespuesta(sock, jid, sender);

        let texto = "";
        let imgPath = null;

        if (["1", "3"].includes(tipo)) {
          await sock.sendMessage(jid, { text: "📝 Escribe el texto a enviar:" });
          texto = await esperarRespuesta(sock, jid, sender);
        }

        if (["2", "3"].includes(tipo)) {
          await sock.sendMessage(jid, { text: "📸 Envía la imagen:" });
          const msgResp = await esperarRespuesta(sock, jid, sender, true);
          const imgMsg =
            msgResp.message?.imageMessage ||
            msgResp.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
          if (imgMsg) {
            const stream = await downloadContentFromMessage(imgMsg, "image");
            const buffer = [];
            for await (const chunk of stream) buffer.push(chunk);
            const fullBuffer = Buffer.concat(buffer);
            const dir = path.join(__dirname, "../../src/media/temp");
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            imgPath = path.join(dir, `auto_${Date.now()}_${i}.png`);
            fs.writeFileSync(imgPath, fullBuffer);
          }
        }

        mensajes.push({ tipo, texto, imgPath });
        await sock.sendMessage(jid, { text: `📌 Mensaje #${i} guardado.` });
      }

      // 🧭 Paso 3️⃣: Selección de grupos
      const groups = await sock.groupFetchAllParticipating();
      const list = Object.entries(groups).map(([id, g], i) => ({ id, name: g.subject, n: i + 1 }));
      let textoGrupos = "📋 *Selecciona los grupos (máx 3)*\nEjemplo: 1,3,5\n\n";
      list.forEach((g) => (textoGrupos += `${g.n}. ${g.name}\n`));
      await sock.sendMessage(jid, { text: textoGrupos });

      const seleccion = await esperarRespuesta(sock, jid, sender);
      const elegidos = seleccion
        .split(",")
        .map((n) => parseInt(n.trim()))
        .filter((n) => !isNaN(n))
        .slice(0, 3);
      const gruposElegidos = list.filter((g) => elegidos.includes(g.n));
      if (!gruposElegidos.length)
        return sock.sendMessage(jid, { text: "❌ No seleccionaste grupos válidos." });

      // 🔁 Paso 4️⃣: Repeticiones
      await sock.sendMessage(jid, { text: "🔁 ¿Cuántas veces repetir el ciclo? (2, 4 o 6)" });
      const repeticiones = parseInt(await esperarRespuesta(sock, jid, sender));
      if (![2, 4, 6].includes(repeticiones))
        return sock.sendMessage(jid, { text: "❌ Número no válido." });

      // ⏰ Paso 5️⃣: Intervalo
      await sock.sendMessage(jid, { text: "⏳ ¿Cada cuántos minutos repetir? (4, 7, 10 o 15)" });
      const minutos = parseInt(await esperarRespuesta(sock, jid, sender));
      if (![4, 7, 10, 15].includes(minutos))
        return sock.sendMessage(jid, { text: "❌ Valor no válido." });

      // 💾 Guardar configuración para reenviar luego
      const config = { mensajes, gruposElegidos, repeticiones, minutos };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // 🧾 Confirmación
      await sock.sendMessage(jid, {
        text: `✅ *Configuración completa*\n\n🖼️ Mensajes: ${mensajes.length}\n📤 Grupos: ${gruposElegidos.length}\n🔁 Repeticiones: ${repeticiones}\n⏳ Intervalo: ${minutos} minutos\n\n> Iniciando envío...`,
      });

      // 🚀 Iniciar envío
      await ejecutarEnvio(sock, jid, config);

      limpiarTemporales();
    } catch (err) {
      console.error("Error en automsg:", err);
      registrarError(err);
      await sock.sendMessage(jid, { text: "❌ Error al ejecutar el envío automático." });
      limpiarTemporales();
    }
  },
};

// =======================================================
// 🔁 Función de envío (reutilizable para reenviar)
// =======================================================
async function ejecutarEnvio(sock, jid, config) {
  const delay = config.minutos * 60 * 1000;

  for (let ciclo = 1; ciclo <= config.repeticiones; ciclo++) {
    for (const g of config.gruposElegidos) {
      for (const m of config.mensajes) {
        try {
          if (m.tipo === "1") {
            await sock.sendMessage(g.id, { text: m.texto });
          } else if (m.tipo === "2") {
            await sock.sendMessage(g.id, { image: { url: m.imgPath } });
          } else if (m.tipo === "3") {
            await sock.sendMessage(g.id, { image: { url: m.imgPath }, caption: m.texto });
          }
          await new Promise((r) => setTimeout(r, 1000));
        } catch (e) {
          console.error("Error enviando mensaje automático:", e.message);
        }
      }
    }

    if (ciclo < config.repeticiones) {
      await sock.sendMessage(jid, {
        text: `📌 Ciclo ${ciclo}/${config.repeticiones} completado.\n> Próximo en ${config.minutos} minutos...`,
      });
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  await sock.sendMessage(jid, { text: "🎉 Todos los envíos finalizados con éxito." });
}

// =======================================================
// 🕒 Esperar respuesta
// =======================================================
async function esperarRespuesta(sock, jid, sender, raw = false, timeout = 60000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      sock.ev.off("messages.upsert", handler);
      resolve("");
    }, timeout);

    const handler = (msgUpsert) => {
      const msg = msgUpsert.messages?.[0];
      if (!msg?.message) return;
      const from = msg.key.participant || msg.key.remoteJid;

      if (from === sender && msg.key.remoteJid === jid) {
        clearTimeout(timer);
        sock.ev.off("messages.upsert", handler);
        if (raw) return resolve(msg);
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          "";
        resolve(text.trim());
      }
    };
    sock.ev.on("messages.upsert", handler);
  });
}

// =======================================================
// 🧾 Registro de errores
// =======================================================
function registrarError(err) {
  try {
    const logDir = path.join(__dirname, "../../data/errors");
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, "log.txt");
    const timestamp = new Date().toLocaleString("es-MX");
    fs.appendFileSync(logPath, `\n━━━━━━━━━━━━━━━\n🕒 ${timestamp}\n${err.stack || err}\n`);
  } catch (e) {
    console.error("❌ Error al registrar en log:", e);
  }
}

// =======================================================
// 🧹 Limpieza de archivos temporales
// =======================================================
function limpiarTemporales() {
  const dir = path.join(__dirname, "../../src/media/temp");
  try {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach((file) => {
        if (file.startsWith("auto_")) fs.unlinkSync(path.join(dir, file));
      });
    }
  } catch (e) {
    console.error("Error limpiando temporales:", e);
  }
}
