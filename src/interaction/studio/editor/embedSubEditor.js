const { ActionRowBuilder, ButtonBuilder } = require(`discord.js`);

const InteractionPanel = require(`../../../models/InteractionPanel`);

const { disableMessageComponents } = require(`../utils/disableComponents`);

const { getSession } = require('../utils/sessionManager');

const { SESSION_MODE } = require('../constants/interactionEnums');

function buildEmbedSubEditorRow(panel) {

  const hasTitle = !!panel.embed?.title;

  const hasDescription = !!panel.embed?.description;

  const hasColor = !!panel.embed?.color;

  const hasAuthor = !!panel.embed?.author?.name;

  const hasImage = !!panel.embed?.image || !!panel.embed?.thumbnail;

  return new ActionRowBuilder().addComponents(

    new ButtonBuilder()

      .setCustomId(`apex:is:embed:set_title`)

      .setLabel(hasTitle ? `Edit Title` : `Set Title`)

      .setStyle(`Primary`),

    new ButtonBuilder()

      .setCustomId(`apex:is:embed:set_description`)

      .setLabel(hasDescription ? `Edit Description` : `Set Description`)

      .setStyle(`Primary`),

    new ButtonBuilder()

      .setCustomId(`apex:is:embed:set_color`)

      .setLabel(hasColor ? `Edit Color` : `Set Color`)

      .setStyle(`Secondary`),

    new ButtonBuilder()

      .setCustomId(`apex:is:embed:set_author`)

      .setLabel(hasAuthor ? `Edit Author` : `Set Author`)

      .setStyle(`Secondary`),

    new ButtonBuilder()

      .setCustomId(`apex:is:embed:set_image`)

      .setLabel(hasImage ? `Edit Image & Thumbnail` : `Set Image & Thumbnail`)

      .setStyle(`Secondary`)

  );

}

function buildEmbedEditorRows(panel) {

  return [

    buildEmbedSubEditorRow(panel),

    buildEmbedSubEditorNavRow()

  ];

}

function buildEmbedSubEditorNavRow() {

  return new ActionRowBuilder().addComponents(

    new ButtonBuilder()

      .setCustomId(`apex:is:embed:back`)

      .setLabel(`Back`)

      .setStyle(`Danger`)

  );

}

async function openEmbedSubEditor(interaction, panelId) {

  const panel = await InteractionPanel.findById(panelId);

  if (!panel) return;
    
    const session = await getSession(interaction.user.id);

  session.mode = SESSION_MODE.EMBED_EDIT;

await session.save();

  // IMMEDIATE UI LOCK

await interaction.update({

  components: disableMessageComponents(interaction.message)

});

// FINAL RENDER

await interaction.message.edit({

  components: [

    buildEmbedSubEditorRow(panel),

    buildEmbedSubEditorNavRow()

  ]

});

}

module.exports = {

  openEmbedSubEditor,
    buildEmbedEditorRows

};

