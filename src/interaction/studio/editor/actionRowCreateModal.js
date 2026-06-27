const {

  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder

} = require(`discord.js`);

async function openCreateActionRowModal(interaction) {

  const modal = new ModalBuilder()

    .setCustomId(`apex:is:editor:ar:create_modal`)

    .setTitle(`Create Action Row`);

  const name = new TextInputBuilder()

    .setCustomId(`ar_name`)

    .setLabel(`Action Row Name`)

    .setStyle(TextInputStyle.Short)

    .setRequired(true)

    .setMaxLength(50);

  modal.addComponents(new ActionRowBuilder().addComponents(name));

  return interaction.showModal(modal);

}

module.exports = { openCreateActionRowModal };

