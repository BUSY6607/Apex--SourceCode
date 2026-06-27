const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

function openSelectMenuCreateModal() {

  const modal = new ModalBuilder()

    .setCustomId('apex:is:select:create_modal')

    .setTitle('Create Select Menu');

  const placeholder = new TextInputBuilder()

    .setCustomId('select_placeholder')

    .setLabel('Placeholder')

    .setStyle(TextInputStyle.Short)

    .setRequired(true);

  const customId = new TextInputBuilder()

    .setCustomId('select_custom_id')

    .setLabel('Custom ID')

    .setStyle(TextInputStyle.Short)

    .setRequired(true);

  const minValues = new TextInputBuilder()

    .setCustomId('select_min')

    .setLabel('Min Values (default 1)')

    .setStyle(TextInputStyle.Short)

    .setRequired(false);

  const maxValues = new TextInputBuilder()

    .setCustomId('select_max')

    .setLabel('Max Values (default 1)')

    .setStyle(TextInputStyle.Short)

    .setRequired(false);

  modal.addComponents(

    new ActionRowBuilder().addComponents(placeholder),

    new ActionRowBuilder().addComponents(customId),

    new ActionRowBuilder().addComponents(minValues),

    new ActionRowBuilder().addComponents(maxValues)

  );

  return modal;

}

module.exports = { openSelectMenuCreateModal };