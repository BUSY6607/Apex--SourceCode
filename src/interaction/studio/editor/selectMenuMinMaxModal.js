const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require(`discord.js`);

function openSelectMenuMinMaxModal(currentMin, currentMax) {

  const modal = new ModalBuilder()
    .setCustomId(`apex:is:select:minmax_modal`)
    .setTitle(`Set Min / Max Values`);

  const minInput = new TextInputBuilder()
    .setCustomId(`select_min_input`)
    .setLabel(`Min Values (1-25)`)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(2)
    .setValue(String(currentMin ?? 1));

  const maxInput = new TextInputBuilder()
    .setCustomId(`select_max_input`)
    .setLabel(`Max Values (1-25)`)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(2)
    .setValue(String(currentMax ?? 1));

  modal.addComponents(
    new ActionRowBuilder().addComponents(minInput),
    new ActionRowBuilder().addComponents(maxInput)
  );

  return modal;

}

module.exports = { openSelectMenuMinMaxModal };
