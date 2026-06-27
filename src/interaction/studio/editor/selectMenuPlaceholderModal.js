const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require(`discord.js`);

function openSelectMenuPlaceholderModal(currentPlaceholder) {

  const modal = new ModalBuilder()
    .setCustomId(`apex:is:select:placeholder_modal`)
    .setTitle(`Edit Placeholder`);

  const input = new TextInputBuilder()
    .setCustomId(`select_placeholder_input`)
    .setLabel(`Placeholder Text`)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(150)
    .setValue(currentPlaceholder || ``);

  modal.addComponents(
    new ActionRowBuilder().addComponents(input)
  );

  return modal;

}

module.exports = { openSelectMenuPlaceholderModal };
