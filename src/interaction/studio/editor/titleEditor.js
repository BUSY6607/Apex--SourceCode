const {

  ModalBuilder,

  TextInputBuilder,

  TextInputStyle,

  ActionRowBuilder

} = require(`discord.js`);

function openTitleModal(interaction, currentTitle) {

  const modal = new ModalBuilder()

    .setCustomId(`apex:is:embed:title_modal`)

    .setTitle(`Set / Edit Title`);

  const titleInput = new TextInputBuilder()

    .setCustomId(`embed_title`)

    .setLabel(`Embed Title`)

    .setStyle(TextInputStyle.Short)

    .setRequired(true)

    .setMaxLength(256);

  if (currentTitle) titleInput.setValue(currentTitle);

  modal.addComponents(

    new ActionRowBuilder().addComponents(titleInput)

  );

  return interaction.showModal(modal);

}

module.exports = {

  openTitleModal

};

