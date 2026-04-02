// src/commands/juegos.js
module.exports = {
  name: 'juego',
  alias: ['games', 'game'],
  description: 'Lista e inicia juegos interactivos',
  noCooldown: true,

  
  exec: async ({ sock, message, args, games }) => {
    const jid = message.key.remoteJid;

    // Si por algún motivo no llega la instancia
    if (!games || typeof games.iniciarJuego !== 'function') {
      return sock.sendMessage(jid, { text: '⚠️ Motor de juegos no disponible.' });
    }

    // Menú
    const menu = `🎮 *Juegos disponibles:*
1) adivina  → Número secreto
2) ahorcado → Adivina la palabra (6 intentos)
3) mates    → Matemáticas rápidas
4) ppt      → Piedra, Papel o Tijeras
5) revuelta → Palabra mezclad
6) emoji    → Emoji Quiz

Ejemplos:
· .juegos 2
· .juegos ahorcado
· .juegos piedra (inicia ppt)
`;

    if (!args[0]) {
      return sock.sendMessage(jid, { text: menu });
    }

    const raw = args.join(' ').toLowerCase().trim();

    // Mapeo de números -> tipo
    const porNumero = {
      '1': 'adivina',
      '2': 'ahorcado',
      '3': 'mates',
      '4': 'ppt',
      '5': 'revuelta',
      '6': 'emoji'
    };

    // Sinónimos -> tipo
    const porSinonimo = {
      // adivina
      'adivina': 'adivina',
      'numero': 'adivina',
      'número': 'adivina',
      'num': 'adivina',
      // ahorcado
      'ahorcado': 'ahorcado',
      'ahorc': 'ahorcado',
      // trivia
      // mates
      'mates': 'mates',
      'matematicas': 'mates',
      'matemáticas': 'mates',
      'math': 'mates',
      'mat': 'mates',
      // ppt
      'ppt': 'ppt',
      'piedra': 'ppt',
      'papel': 'ppt',
      'tijera': 'ppt',
      'tijeras': 'ppt',
      // revuelta
      'revuelta': 'revuelta',
      'mezclada': 'revuelta',
      'anagrama': 'revuelta',
      'jumbled': 'revuelta',
      // verdad o reto
      // emoji
      'emoji': 'emoji',
      'emojis': 'emoji',
      'emojitest': 'emoji'
    };

    // Normalizar selección
    const tipo = porNumero[raw] || porSinonimo[raw] || porSinonimo[raw.split(' ')[0]];

    if (!tipo) {
      await sock.sendMessage(jid, { text: `⚠️ Juego no reconocido.\n\n${menu}` });
      return;
    }

    // Iniciar juego
    await games.iniciarJuego(jid, tipo);
  }
};
