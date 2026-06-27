const {

  ModalBuilder,

  TextInputBuilder,

  TextInputStyle,

  ActionRowBuilder

} = require(`discord.js`);

async function openAuthorModal(interaction, author = {}) {

  const modal = new ModalBuilder()

    .setCustomId(`apex:is:embed:author_modal`)

    .setTitle(`Set / Edit Author`);

  const nameInput = new TextInputBuilder()

  .setCustomId(`embed_author_name`)

  .setLabel(`Author Name`)

  .setStyle(TextInputStyle.Short)

  .setRequired(true);

if (author?.name) {

  nameInput.setValue(author.name);

}

  const iconInput = new TextInputBuilder()

    .setCustomId(`embed_author_icon`)

    .setLabel(`Author Icon URL (optional)`)

    .setStyle(TextInputStyle.Short)

    .setRequired(false)

    .setValue(author?.iconURL || ``);

  modal.addComponents(

    new ActionRowBuilder().addComponents(nameInput),

    new ActionRowBuilder().addComponents(iconInput)

  );

  return interaction.showModal(modal);

}

module.exports = {

  openAuthorModal

};

