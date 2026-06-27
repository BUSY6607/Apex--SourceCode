const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

function openSelectOptionModal() {

  const modal = new ModalBuilder()

    .setCustomId('apex:is:select:option_modal')

    .setTitle('Add Select Option');

  const label = new TextInputBuilder()

    .setCustomId('opt_label')

    .setLabel('Option Label')

    .setStyle(TextInputStyle.Short)

    .setRequired(true);

  const value = new TextInputBuilder()

    .setCustomId('opt_value')

    .setLabel('Option Value')

    .setStyle(TextInputStyle.Short)

    .setRequired(true);

  const description = new TextInputBuilder()

    .setCustomId('opt_desc')

    .setLabel('Description (optional)')

    .setStyle(TextInputStyle.Short)

    .setRequired(false);

  const emoji = new TextInputBuilder()

    .setCustomId('opt_emoji')

    .setLabel('Emoji (optional)')

    .setStyle(TextInputStyle.Short)

    .setRequired(false);

  modal.addComponents(

    new ActionRowBuilder().addComponents(label),

    new ActionRowBuilder().addComponents(value),

    new ActionRowBuilder().addComponents(description),

    new ActionRowBuilder().addComponents(emoji)

  );

  return modal;

}

module.exports = { openSelectOptionModal };