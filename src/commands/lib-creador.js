// ===============================================
// 👑 Comando: creador.js
// Muestra la información del creador del bot.
// ===============================================
module.exports = {
  name: 'creador',
  alias: ['owner', 'dev', 'author'],
  description: 'Muestra la información oficial del creador.',
  noCooldown: true,


  async exec({ sock, message }) {
    const jid = message.key.remoteJid;

    const info = `
╭━━━〔👑〕━━━╮
*     *ＣＲＥＡＤＯＲ  ＢＯＴ*
╰━━━〔👑〕━━━╯

*👤 𝘾𝙧𝙚𝙖𝙙𝙤𝙧:*
> _SᴜᴘʀᴇᴍTX_

*📞 𝘾𝙤𝙣𝙩𝙖𝙘𝙩𝙤𝙨:*
> _+52 479 179 1766_
> _+57 324 4028894_

*✈️ 𝙏𝙚𝙡𝙚𝙜𝙧𝙖𝙢:*
> _@SᴜᴘʀᴇᴍTX1_

*💻 𝙂𝙞𝙩𝙃𝙪𝙗:*
> _github.com/Suprem-TX_

*💻 𝙉𝙪𝙚𝙨𝙩𝙧𝙖 𝙒𝙚𝙗:*
> _https://web.suprem-dev.shop/_

*📚 𝙎𝙚𝙧𝙫𝙞𝙘𝙞𝙤𝙨*
> _Bᴏᴛ ᴅᴇ Gʀᴜᴘᴏs_
> _Bᴏᴛ Tɪᴇɴᴅᴀ_
> _Pᴀɢɪɴᴀs Wᴇʙ_
> _Bᴏᴛ Sᴘᴀᴍ_
`.trim();

    await sock.sendMessage(jid, {
      text: info,
    });
  },
};
