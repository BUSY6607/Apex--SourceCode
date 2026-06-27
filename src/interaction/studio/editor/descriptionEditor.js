const {

  ModalBuilder,

  TextInputBuilder,

  TextInputStyle,

  ActionRowBuilder,

} = require("discord.js");

async function openDescriptionModal(interaction, currentDescription) {

  const modal = new ModalBuilder()

    .setCustomId("apex:is:embed:description_modal")

    .setTitle("Set / Edit Embed Description");

  const input = new TextInputBuilder()

    .setCustomId("embed_description")

    .setLabel("Embed Description")

    .setStyle(TextInputStyle.Paragraph)

    .setRequired(true)

    .setMaxLength(4000)

    .setPlaceholder("Enter embed description here...");

  if (currentDescription) {

    input.setValue(currentDescription);

  }

  modal.addComponents(

    new ActionRowBuilder().addComponents(input)

  );

  await interaction.showModal(modal);

}

module.exports = {

  openDescriptionModal,

};

