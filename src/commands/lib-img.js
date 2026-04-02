const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { spawn } = require('child_process');
const { tmpdir } = require('os');
const path = require('path');
const fs = require('fs');

const cooldowns = new Map();

module.exports = {
  name: 'img',
  alias: ['toimg', 'toimage'],
  description: 'Convierte un sticker (estático o animado) a imagen o video.',
  noCooldown: true,


  exec: async ({ sock, message }) => {
    const jid = message.key.remoteJid;

    // 🕒 Cooldown global (2 s)
    const now = Date.now();
    if (cooldowns.has(jid) && now - cooldowns.get(jid) < 2000) {
      await sock.sendMessage(jid, { react: { text: '⏳', key: message.key } });
      return;
    }
    cooldowns.set(jid, now);

    try {
      const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.stickerMessage) {
        return await sock.sendMessage(
          jid,
          { text: '⚠️ Responde a un sticker para convertirlo.' },
          { quoted: message }
        );
      }

      await sock.sendMessage(jid, { react: { text: '🔄', key: message.key } });

      // 📥 Descargar sticker (como buffer)
      const stickerBuffer = await downloadMediaMessage(
        { message: quoted },
        'buffer',
        {},
        { logger: console }
      );
      const isAnimated = quoted.stickerMessage.isAnimated;

      // 📁 Crear archivo temporal
      const inputPath = path.join(tmpdir(), `sticker-${Date.now()}.webp`);
      fs.writeFileSync(inputPath, stickerBuffer);

      if (isAnimated) {
        // 🎞️ Animado → video .mp4
        const outputPath = path.join(tmpdir(), `anim-${Date.now()}.mp4`);

        await new Promise((resolve, reject) => {
          const ffmpeg = spawn('ffmpeg', [
            '-y',
            '-i', inputPath,
            '-movflags', 'faststart',
            '-pix_fmt', 'yuv420p',
            '-vf', 'scale=512:-1:flags=lanczos',
            outputPath
          ]);

          ffmpeg.stderr.on('data', d => console.log('FFmpeg:', d.toString()));
          ffmpeg.on('close', code => (code === 0 ? resolve() : reject(new Error(`FFmpeg exited with code ${code}`))));
          ffmpeg.on('error', reject);
        });

        const videoBuffer = fs.readFileSync(outputPath);
        await sock.sendMessage(
          jid,
          {
            video: videoBuffer,
            gifPlayback: true,
            caption: '🎥 Sticker animado convertido a video.'
          },
          { quoted: message }
        );

        fs.unlinkSync(outputPath);
      } else {
        // 🖼️ Estático → imagen .jpg
        const outputPath = path.join(tmpdir(), `stimg-${Date.now()}.jpg`);

        await new Promise((resolve, reject) => {
          const ffmpeg = spawn('ffmpeg', [
            '-y',
            '-i', inputPath,
            '-vframes', '1',
            outputPath
          ]);

          ffmpeg.stderr.on('data', d => console.log('FFmpeg:', d.toString()));
          ffmpeg.on('close', code => (code === 0 ? resolve() : reject(new Error(`FFmpeg exited with code ${code}`))));
          ffmpeg.on('error', reject);
        });

        const imageBuffer = fs.readFileSync(outputPath);
        await sock.sendMessage(
          jid,
          {
            image: imageBuffer,
            caption: '🖼️ Sticker convertido a imagen.'
          },
          { quoted: message }
        );

        fs.unlinkSync(outputPath);
      }

      fs.unlinkSync(inputPath);
      await sock.sendMessage(jid, { react: { text: '✅', key: message.key } });
    } catch (error) {
      console.error('[IMG ERROR]', error);
      await sock.sendMessage(jid, {
        text: '❌ Ocurrió un error al convertir el sticker.\nVerifica que FFmpeg esté instalado correctamente.'
      });
    }
  }
};
