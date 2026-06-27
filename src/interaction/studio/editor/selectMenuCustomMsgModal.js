const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require(`discord.js`);

function buildSelectMenuCustomMsgModal() {

  const modal = new ModalBuilder()
    .setCustomId(`apex:is:select:custom_msg_modal`)
    .setTitle(`Custom Message for Option`);

  const content = new TextInputBuilder()
    .setCustomId(`sel_custom_msg_content`)
    .setLabel(`Message Content`)
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(content)
  );

  return modal;

}

module.exports = { buildSelectMenuCustomMsgModal };
