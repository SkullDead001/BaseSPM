const fetch = require('node-fetch');

// ===============================
// 🔎 Algoritmo Luhn (validación)
// ===============================
function luhnCheck(num) {
  let arr = (num + '').split('').reverse().map(x => parseInt(x));
  let lastDigit = arr.shift();
  let sum = arr.reduce(
    (acc, val, i) =>
      acc + (i % 2 === 0 ? (val * 2 > 9 ? val * 2 - 9 : val * 2) : val),
    0
  );
  sum += lastDigit;
  return sum % 10 === 0;
}

// ===============================
// 🎲 Generar tarjeta válida
// ===============================
function generarTarjeta(binInput) {
  let base = binInput.replace(/[^0-9x]/gi, '');

  // Si no trae x, completar hasta 15 dígitos
  if (!base.includes('x')) {
    while (base.length < 15) {
      base += Math.floor(Math.random() * 10);
    }
  }

  // Reemplazar x por números aleatorios
  base = base.replace(/x/gi, () => Math.floor(Math.random() * 10));

  // Asegurar 15 dígitos antes del check
  base = base.slice(0, 15);

  // Calcular dígito verificador (Luhn)
  let sum = 0;
  let reversed = base.split('').reverse();

  for (let i = 0; i < reversed.length; i++) {
    let digit = parseInt(reversed[i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  const checkDigit = (10 - (sum % 10)) % 10;

  return base + checkDigit;
}

// ===============================
// 📥 Normalizar entrada
// ===============================
function parseEntrada(text) {
  let partes = text.replace(/[\s:/.-]+/g, '|').split('|');
  return {
    bin: partes[0] || '',
    mes: partes[1] || Math.floor(Math.random() * 12 + 1).toString().padStart(2, '0'),
    ano: partes[2] || (new Date().getFullYear() + 2).toString().slice(-2),
    cvv: partes[3] || Math.floor(Math.random() * 999).toString().padStart(3, '0')
  };
}

// ===============================
// 🏦 Info BIN
// ===============================
async function infoBIN(bin) {
  try {
    const res = await fetch(`https://lookup.binlist.net/${bin}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ===============================
// 🚀 EXPORT COMANDO
// ===============================
module.exports = {
  name: 'gen',
  alias: ['generate', 'ccgen'],
  description: 'Genera tarjetas válidas a partir de un BIN',
  noCooldown: true,

  exec: async ({ sock, message, args }) => {
    try {
      const jid = message.key.remoteJid;
      const binInput = args[0];

      if (!binInput) {
        await sock.sendMessage(jid, {
          text: `⚠️ *Uso correcto*\n\n> .gen 457173xxxxxx|12|25`
        });
        return;
      }

      const { bin, mes, ano, cvv } = parseEntrada(binInput);

      if (bin.replace(/[^0-9]/g, '').length < 6) {
        await sock.sendMessage(jid, {
          text: '> ⚠️ *El BIN debe tener al menos 6 dígitos.*'
        });
        return;
      }

      // 🔥 Generar 10 tarjetas únicas
      let lista = new Set();

      while (lista.size < 10) {
        const cc = generarTarjeta(bin);
        if (luhnCheck(cc)) {
          lista.add(`${cc}|${mes}|${ano}|${cvv}`);
        }
      }

      lista = Array.from(lista);

      // 🏦 Información del BIN
      const info = await infoBIN(bin.slice(0, 6));
      let infoText = '';

      if (info) {
        infoText = `
🏦 *Banco*
> ${info.bank?.name || 'Desconocido'}

💳 *Marca*
> ${info.scheme || 'N/A'}

💳 *Tipo*
> ${info.type || 'N/A'}

🌍 *País*
> ${info.country?.name || 'N/A'} ${info.country?.emoji || ''}
`;
      }

const texto = `
> ɢᴇɴᴇʀᴀᴄɪᴏ́ɴ ᴄᴏᴍᴘʟᴇᴛᴀ

* *🏦 ʙᴀɴᴄᴏ*
> ${info?.bank?.name || 'ᴅᴇsᴄᴏɴᴏᴄɪᴅᴏ'}

* *💳 ᴍᴀʀᴄᴀ*
> ${info?.scheme || 'ɴ/ᴀ'}

* *📂 ᴛɪᴘᴏ*
> ${info?.type || 'ɴ/ᴀ'}

* *🌍 ᴘᴀɪ́s*
> ${info?.country?.name || 'ɴ/ᴀ'} ${info?.country?.emoji || ''}

* *🔢 ʙɪɴ*
> ${bin}

━━━━━━━━━━━━━━━━━━

${lista.join('\n')}
`;

      await sock.sendMessage(jid, { text: texto.trim() });

    } catch (err) {
      console.error('Error en comando gen:', err);
      await sock.sendMessage(message.key.remoteJid, {
        text: '❌ *Error al generar las tarjetas.*'
      });
    }
  }
};