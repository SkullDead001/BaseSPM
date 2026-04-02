// 📁 src/commands/ph4.js
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { spawn } = require('child_process');

const pendingSelections = new Map();

module.exports = {
  name: 'ph4',
  alias: ['porn4', 'phub4', 'pornhub4'],
  description: 'Busca y descarga videos de Pornhub de forma interactiva.',
  noCooldown: true,

  async exec({ sock, message, args }) {
    const jid = message.key.remoteJid;
    const sender = message.key.participant || jid;
    const query = args.join(' ').trim();

    if (!query) {
      await sock.sendMessage(jid, { text: '❌ Usa: *.ph4 [búsqueda]*\n> Ejemplo: .ph4 cachonda' });
      return;
    }

    const downloadsDir = path.join(__dirname, '../../data/downloads');
    const pythonScriptPath = path.join(__dirname, '../python/download-hb4.py');
    await fs.promises.mkdir(downloadsDir, { recursive: true });

    try {
      await sock.sendMessage(jid, { text: `🔎 Buscando *${query}* en Pornhub...` });

      const searchUrl = `https://www.pornhub.com/webmasters/search?search=${encodeURIComponent(query)}`;
      const res = await fetch(searchUrl);
      const json = await res.json();

      if (!json.videos || json.videos.length === 0) {
        await sock.sendMessage(jid, { text: `❌ No se encontraron resultados para *${query}*.` });
        return;
      }

      const top3 = json.videos.slice(0, 3);
      let msg = '🎬 *Resultados encontrados:*\n\n';
      top3.forEach((v, i) => {
        msg += `*${i + 1}.* ${v.title}\n`;
        msg += `⏱️ ${v.duration} | 👀 ${v.views} | 👍 ${v.rating}%\n`;
        msg += `🔗 ${v.url}\n\n`;
      });
      msg += '👉 *Responde con 1, 2 o 3* para elegir cuál descargar.';

      await sock.sendMessage(jid, { text: msg });
      pendingSelections.set(sender, { results: top3, pythonScriptPath, downloadsDir });

      setTimeout(() => pendingSelections.delete(sender), 60000);
    } catch (err) {
      console.error('[PH4-Error-Busqueda]', err);
      await sock.sendMessage(jid, { text: `❌ Error al buscar: ${err.message}` });
    }
  },

  async onMessage(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || jid;
    const text = msg.message?.conversation?.trim();

    if (!pendingSelections.has(sender)) return;
    if (!['1', '2', '3'].includes(text)) return;

    const { results, pythonScriptPath, downloadsDir } = pendingSelections.get(sender);
    pendingSelections.delete(sender);

    const choice = parseInt(text) - 1;
    const video = results[choice];
    if (!video) return;

    const title = video.title;
    const url = video.url;

    // 📩 Enviar mensaje inicial de progreso
    const progressMsg = await sock.sendMessage(jid, {
      text: `🎬 *Descargando:* ${title}\n🔗 ${url}\n\n⏳ Progreso: 0%`
    });

    const python = spawn('python3', [pythonScriptPath, url, downloadsDir]);
    let finalPath = '';
    let lastPercent = 0;

    python.stdout.on('data', async (data) => {
      const line = data.toString().trim();

      if (line.startsWith('[PROGRESS]')) {
        const percent = parseFloat(line.replace('[PROGRESS]', '').trim());
        // 🔁 Actualiza solo si el cambio es de al menos 5%
        if (percent - lastPercent >= 15) {
          lastPercent = percent;
          try {
            await sock.sendMessage(jid, {
              edit: progressMsg.key,
              text: `🎬 *Descargando:* ${title}\n🔗 ${url}\n\n⏳ Progreso: ${percent.toFixed(1)}%`
            });
          } catch { }
        }
      }

      if (line.startsWith('[DONE]')) {
        finalPath = line.replace('[DONE]', '').trim();
      }
    });

    python.stderr.on('data', (data) => {
      console.error('[PH4-Error]', data.toString());
    });

    python.on('close', async (code) => {
      if (code === 0 && finalPath && fs.existsSync(finalPath)) {
        await sock.sendMessage(jid, {
          video: { url: finalPath },
          caption: `✅ *Descarga completa*\n📹 ${title}`
        });

        // 🗑️ Elimina el archivo descargado
        fs.unlink(finalPath, (err) => {
          if (err) console.error('[PH4-Cleanup]', err);
        });

        // ✅ Actualiza el mensaje final
        await sock.sendMessage(jid, {
          edit: progressMsg.key,
          text: `✅ *Completado:* ${title}\n📹 Enviado correctamente ✅`
        });

      } else {
        await sock.sendMessage(jid, {
          edit: progressMsg.key,
          text: `❌ No se pudo completar la descarga de *${title}*.`
        });
      }
    });
  }
};
