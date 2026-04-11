// /utils/Juegos.js
class JuegosManager {
  constructor(sock, juegosActivos) {
    this.sock = sock;
    this.juegosActivos = juegosActivos;
  }

  async iniciarJuego(jid, tipo) {
    switch (tipo) {
      case 'adivina':
        this.juegosActivos.set(jid, {
          tipo,
          numero: Math.floor(Math.random() * 100) + 1,
          intentos: 0,
          maxIntentos: 5
        });
        return this.sock.sendMessage(jid, {
          text: "🎯 He pensado un número entre 1 y 100. ¡Tienes 5 intentos!"
        });

      case 'ahorcado':
        const palabras = ["gato", "perro", "jirafa", "computadora", "reggaeton", "instagram"];
        const palabra = palabras[Math.floor(Math.random() * palabras.length)];
        this.juegosActivos.set(jid, { tipo, palabra, letras: [], intentos: 6 });
        return this.sock.sendMessage(jid, {
          text: `🪓 *AHORCADO*\n\nAdivina la palabra:\n${this.ocultar(palabra, [])}\n\nIntentos: 6`
        });

case 'mates':
  // Definir números y operaciones
  const n1 = Math.floor(Math.random() * 100) + 1;
  const n2 = Math.floor(Math.random() * 100) + 1;
  const n3 = Math.floor(Math.random() * 50); // tercer número opcional
  const operaciones = ["+", "-", "*", "/", "%", "^"];
  const op1 = operaciones[Math.floor(Math.random() * operaciones.length)];
  const op2 = operaciones[Math.floor(Math.random() * operaciones.length)];

  let expresion = `${n1} ${op1} ${n2}`;

  // A veces meter un tercer número para más dificultad
  if (Math.random() > 0.5) expresion = `${expresion} ${op2} ${n3}`;

  // Evaluar resultado (asegurando que sea entero en divisiones)
  let resultado;
  try {
    resultado = Math.floor(eval(expresion.replace("^", "**"))); 
  } catch {
    resultado = 0;
  }

  this.juegosActivos.set(jid, { tipo, res: resultado, intentos: 5 });
  return this.sock.sendMessage(jid, {
    text: `🧮 Resuelve: ${expresion}\n\n📉 Tienes 5 intentos.`
  });


      case 'ppt':
        this.juegosActivos.set(jid, { tipo });
        return this.sock.sendMessage(jid, { text: "✊ Piedra, ✋ Papel o ✌️ Tijeras. Escribe tu jugada:" });

      case 'revuelta':
        const palabras2 = ["bot", "musica", "whatsapp", "javascript"];
        const p2 = palabras2[Math.floor(Math.random() * palabras2.length)];
        const rev = p2.split("").sort(() => Math.random() - 0.5).join("");
        this.juegosActivos.set(jid, { tipo, palabra: p2, intentos: 3 });
        return this.sock.sendMessage(jid, { text: `🔀 Adivina la palabra: *${rev}*\n\nTienes 3 intentos.` });

      case 'emoji':
        const quiz = [
          { e: "🦁👑", a: "rey leon" },
          { e: "🚗💨", a: "rapido y furioso" },
          { e: "🧙‍♂️⚡", a: "harry potter" }
        ];
        const q2 = quiz[Math.floor(Math.random() * quiz.length)];
        this.juegosActivos.set(jid, { tipo, respuesta: q2.a, intentos: 3 });
        return this.sock.sendMessage(jid, {
          text: `🔮 *EMOJI QUIZ* 🔮\n\nAdivina la peli/serie: ${q2.e}\n\n📉 Tienes 3 intentos.`
        });

      default:
        return this.sock.sendMessage(jid, { text: "⚠️ Juego no encontrado." });
    }
  }

  ocultar(palabra, letras) {
    return palabra.split("").map(l => letras.includes(l) ? l : "_").join(" ");
  }

  async procesarMensaje(msg) {
    const jid = msg.key.remoteJid;
    const juego = this.juegosActivos.get(jid);
    if (!juego) return false;

    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();

    switch (juego.tipo) {
      case 'adivina':
        const n = parseInt(text);
        if (isNaN(n)) return false;
        juego.intentos++;
        if (n === juego.numero) {
          await this.sock.sendMessage(jid, { text: `🎉 ¡Correcto! El número era ${juego.numero}` });
          this.juegosActivos.delete(jid);
        } else if (juego.intentos >= juego.maxIntentos) {
          await this.sock.sendMessage(jid, { text: `❌ Sin intentos. Era ${juego.numero}` });
          this.juegosActivos.delete(jid);
        } else {
          await this.sock.sendMessage(jid, { text: n > juego.numero ? "⬇️ Menor" : "⬆️ Mayor" });
        }
        return true;

      case 'ahorcado':
        if (text.length !== 1) return false;
        if (!juego.palabra.includes(text)) juego.intentos--;
        juego.letras.push(text);
        const oculta = this.ocultar(juego.palabra, juego.letras);
        if (!oculta.includes("_")) {
          await this.sock.sendMessage(jid, { text: `🎉 Correcto, la palabra era: ${juego.palabra}` });
          this.juegosActivos.delete(jid);
        } else if (juego.intentos <= 0) {
          await this.sock.sendMessage(jid, { text: `😵 Perdiste. Era ${juego.palabra}` });
          this.juegosActivos.delete(jid);
        } else {
          await this.sock.sendMessage(jid, { text: `Progreso: ${oculta}\nIntentos: ${juego.intentos}` });
        }
        return true;

      case 'trivia':
      case 'emoji':
        if (text === juego.respuesta) {
          await this.sock.sendMessage(jid, { text: `🎉 ¡Correcto! Era: ${juego.respuesta}` });
          this.juegosActivos.delete(jid);
        } else {
          juego.intentos--;
          if (juego.intentos <= 0) {
            await this.sock.sendMessage(jid, { text: `❌ Has perdido. La respuesta era: ${juego.respuesta}` });
            this.juegosActivos.delete(jid);
          } else {
            await this.sock.sendMessage(jid, { text: `❌ Incorrecto. Te quedan ${juego.intentos} intentos.` });
          }
        }
        return true;

      case 'mates':
        if (parseInt(text) === juego.res) {
          await this.sock.sendMessage(jid, { text: "🎉 ¡Correcto!" });
          this.juegosActivos.delete(jid);
        } else {
          juego.intentos--;
          if (juego.intentos <= 0) {
            await this.sock.sendMessage(jid, { text: `❌ Perdiste. La respuesta era ${juego.res}` });
            this.juegosActivos.delete(jid);
          } else {
            await this.sock.sendMessage(jid, { text: `❌ Incorrecto. Te quedan ${juego.intentos} intentos.` });
          }
        }
        return true;

      case 'ppt':
        const jugadas = ["piedra", "papel", "tijeras"];
        if (!jugadas.includes(text)) return false;
        const bot = jugadas[Math.floor(Math.random() * 3)];
        let r = "🤝 Empate";
        if ((text === "piedra" && bot === "tijeras") ||
            (text === "papel" && bot === "piedra") ||
            (text === "tijeras" && bot === "papel")) r = "🎉 Ganaste";
        else if (text !== bot) r = "😢 Perdiste";
        await this.sock.sendMessage(jid, { text: `Tú: ${text}\nBot: ${bot}\n${r}` });
        this.juegosActivos.delete(jid);
        return true;

      case 'revuelta':
        if (text === juego.palabra) {
          await this.sock.sendMessage(jid, { text: `🎉 Correcto, la palabra era ${juego.palabra}` });
          this.juegosActivos.delete(jid);
        } else {
          juego.intentos--;
          if (juego.intentos <= 0) {
            await this.sock.sendMessage(jid, { text: `❌ Perdiste. La palabra era ${juego.palabra}` });
            this.juegosActivos.delete(jid);
          } else {
            await this.sock.sendMessage(jid, { text: `❌ Incorrecto. Te quedan ${juego.intentos} intentos.` });
          }
        }
        return true;


              // ==========================================================
      // 🔥  A H O R C A D O   1 v 1   (Turnos, Anti-spam, UI limpia)
      // ==========================================================
      case 'ahorcado1v1':
        const sender = msg.key.participant;

        // Solo los dos pueden jugar
        if (!juego.jugadores.includes(sender)) return false;

        // Leer mensaje
        const txt = text.trim();
        if (!txt.startsWith(".letra") && !txt.startsWith(".palabra")) return false;

        const turnoActual = juego.jugadores[juego.turnoIndex];

        // =============================
        // 🔐 ANTI-SPAM de turno
        // =============================
        const nowTS = Date.now();
        juego.turnSpam[sender] ||= 0;

        if (sender !== turnoActual) {
          if (nowTS - juego.turnSpam[sender] > 3500) {
            juego.turnSpam[sender] = nowTS;

            await this.sock.sendMessage(jid, {
              text: `⏳ *No es tu turno* @${sender.split("@")[0]}\n` +
                    `👉 Le toca a @${turnoActual.split("@")[0]}`,
              mentions: [sender, turnoActual]
            });
          }
          return true;
        }

        // =============================
        // MANEJO DE .letra a
        // =============================
        if (txt.startsWith(".letra")) {
          const letra = txt.split(" ")[1];
          if (!letra) return true;

          const L = letra[0].toLowerCase();
          if (!/[a-zñ]/.test(L)) return true;

          if (juego.letrasUsadas.has(L)) {
            await this.sock.sendMessage(jid, {
              text: `⚠️ La letra *${L.toUpperCase()}* ya fue usada.`,
            });
            return true;
          }

          juego.letrasUsusedas.add(L);

          if (juego.palabra.includes(L)) {
            const estado = juego.palabra
              .split("")
              .map(l => juego.letrasUsusedas.has(l) ? l : "_")
              .join(" ");

            if (!estado.includes("_")) {
              await this.sock.sendMessage(jid, {
                text: `🎉 *¡Han adivinado la palabra!* 🎉\n\n` +
                      `🔤 Palabra: *${juego.palabra}*\n` +
                      `🏆 Ganadores: @${juego.jugadores[0].split("@")[0]} y @${juego.jugadores[1].split("@")[0]}`,
                mentions: juego.jugadores
              });
              this.juegosActivos.delete(jid);
              return true;
            }

            // Cambio de turno
            juego.turnoIndex = juego.turnoIndex === 0 ? 1 : 0;
            const next = juego.jugadores[juego.turnoIndex];

            await this.sock.sendMessage(jid, {
              text: `✨ La letra *${L.toUpperCase()}* está en la palabra!\n\n` +
                    `🔠 ${estado}\n\n` +
                    `🎯 Turno de: @${next.split("@")[0]}`,
              mentions: juego.jugadores
            });

            return true;
          }

          // Fallo
          juego.errores++;

          if (juego.errores >= juego.maxErrores) {
            await this.sock.sendMessage(jid, {
              text: `💀 Han perdido.\n\nLa palabra era: *${juego.palabra}*`,
            });
            this.juegosActivos.delete(jid);
            return true;
          }

          // Cambio de turno
          juego.turnoIndex = juego.turnoIndex === 0 ? 1 : 0;

          await this.sock.sendMessage(jid, {
            text: `❌ La letra *${L.toUpperCase()}* no aparece.\n` +
                  `❤️ Vidas: ${juego.maxErrores - juego.errores}\n\n` +
                  `🎯 Turno ahora de @${juego.jugadores[juego.turnoIndex].split("@")[0]}`,
            mentions: juego.jugadores
          });

          return true;
        }


        // =============================
        // MANEJO DE .palabra solucion
        // =============================
        if (txt.startsWith(".palabra")) {
          const intento = txt.substring(9).trim().toLowerCase();
          if (!intento) return true;

          if (intento === juego.palabra) {
            await this.sock.sendMessage(jid, {
              text: `🎉 *¡Han resuelto la palabra!* 🎉\n\n` +
                    `🔤 Palabra: *${juego.palabra}*`,
              mentions: juego.jugadores
            });
            this.juegosActivos.delete(jid);
            return true;
          }

          // Fallo fuerte (pierdes dos vidas)
          juego.errores += 2;

          if (juego.errores >= juego.maxErrores) {
            await this.sock.sendMessage(jid, {
              text: `💀 Error fatal.\n\nLa palabra era: *${juego.palabra}*`
            });
            this.juegosActivos.delete(jid);
            return true;
          }

          juego.turnoIndex = juego.turnoIndex === 0 ? 1 : 0;

          await this.sock.sendMessage(jid, {
            text: `❌ Esa no era la palabra.\n` +
                  `❤️ Vidas: ${juego.maxErrores - juego.errores}\n\n` +
                  `🎯 Turno de @${juego.jugadores[juego.turnoIndex].split("@")[0]}`,
            mentions: juego.jugadores
          });

          return true;
        }

        return true;
    }

    return false;
  }
}

module.exports = JuegosManager;
