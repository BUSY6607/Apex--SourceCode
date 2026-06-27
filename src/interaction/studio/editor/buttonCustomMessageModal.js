const {

  ModalBuilder,

  TextInputBuilder,

  TextInputStyle,

  ActionRowBuilder

} = require('discord.js');

/**

 * Builds modal for "Send Custom Message" button action

 */

function buildCustomMessageModal() {

  const modal = new ModalBuilder()

    .setCustomId('apex:is:btn:custom_msg_modal')

    .setTitle('Send Custom Message');

  const messageInput = new TextInputBuilder()

    .setCustomId('custom_msg_content')

    .setLabel('Message Content')

    .setStyle(TextInputStyle.Paragraph)

    .setPlaceholder('Enter the message to send when this button is clicked')

    .setRequired(true)

    .setMaxLength(2000);

  const row = new ActionRowBuilder().addComponents(messageInput);

  modal.addComponents(row);

  return modal;

}

module.exports = { buildCustomMessageModal };

