const {

  ModalBuilder,

  TextInputBuilder,

  TextInputStyle,

  ActionRowBuilder

} = require(`discord.js`);

async function openAddButtonModal(interaction) {

  const modal = new ModalBuilder()

    .setCustomId(`apex:is:ar:button_modal`)

    .setTitle(`Add Button`);

  const label = new TextInputBuilder()

    .setCustomId(`btn_label`)

    .setLabel(`Button Label`)

    .setStyle(TextInputStyle.Short)

    .setRequired(true)

    .setMaxLength(80);

  const customId = new TextInputBuilder()

    .setCustomId(`btn_custom_id`)

    .setLabel(`Button Custom ID`)

    .setStyle(TextInputStyle.Short)

    .setRequired(true);

  const emoji = new TextInputBuilder()

    .setCustomId(`btn_emoji`)

    .setLabel(`Emoji (optional)`)

    .setStyle(TextInputStyle.Short)

    .setRequired(false);

  modal.addComponents(

    new ActionRowBuilder().addComponents(label),

    new ActionRowBuilder().addComponents(customId),

    new ActionRowBuilder().addComponents(emoji)

  );

  return interaction.showModal(modal);

}

module.exports = { openAddButtonModal };

