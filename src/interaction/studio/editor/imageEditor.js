const {

  ModalBuilder,

  TextInputBuilder,

  TextInputStyle,

  ActionRowBuilder

} = require(`discord.js`);

async function openImageModal(interaction, image = null, thumbnail = null) {

  const modal = new ModalBuilder()

    .setCustomId(`apex:is:embed:image_modal`)

    .setTitle(`Set / Edit Image & Thumbnail`);

  const imageInput = new TextInputBuilder()

    .setCustomId(`embed_image_url`)

    .setLabel(`Image URL (optional)`)

    .setStyle(TextInputStyle.Short)

    .setRequired(false);

  const thumbInput = new TextInputBuilder()

    .setCustomId(`embed_thumbnail_url`)

    .setLabel(`Thumbnail URL (optional)`)

    .setStyle(TextInputStyle.Short)

    .setRequired(false);

  if (typeof image === "string" && image.trim().length > 0) {

  imageInput.setValue(image);

}

if (typeof thumbnail === "string" && thumbnail.trim().length > 0) {

  thumbInput.setValue(thumbnail);

}

  modal.addComponents(

    new ActionRowBuilder().addComponents(imageInput),

    new ActionRowBuilder().addComponents(thumbInput)

  );

  return interaction.showModal(modal);

}

module.exports = {

  openImageModal

};

