const {

  ModalBuilder,

  TextInputBuilder,

  TextInputStyle,

  ActionRowBuilder

} = require('discord.js');

function buildURLModal() {

  const modal = new ModalBuilder()

    .setCustomId(`apex:is:btn:url_modal`)

    .setTitle(`Open URL Action`);

  const urlInput = new TextInputBuilder()

    .setCustomId(`url_input`)

    .setLabel(`Enter URL`)

    .setStyle(TextInputStyle.Short)

    .setRequired(true)

    .setPlaceholder(`https://example.com`);

  modal.addComponents(

    new ActionRowBuilder().addComponents(urlInput)

  );

  return modal;

}

module.exports = { buildURLModal };