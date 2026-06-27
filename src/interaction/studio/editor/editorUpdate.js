const { EmbedBuilder } = require(`discord.js`);

const InteractionPanel = require(`../../../models/InteractionPanel`);

const { ActionRowBuilder, ButtonBuilder,ButtonStyle } = require(`discord.js`);

function buildEditorEmbed(panel) {

  const embed = new EmbedBuilder()

    .setTitle(panel.embed?.title || `🧩 Apex Interaction Studio`)

    .setDescription(

      panel.embed?.description ||

      `Use the buttons below to design the embed and add interactions.`

    ) .setFooter({ text: `Apex • Interaction Studio` });
    if (panel.embed?.author?.name) {

  embed.setAuthor({

    name: panel.embed.author.name,

    iconURL: panel.embed.author.iconURL || null

  });

} 

if (panel.embed?.image) {

  embed.setImage(panel.embed.image);

}

if (panel.embed?.thumbnail) {

  embed.setThumbnail(panel.embed.thumbnail);

}

  const defaultBlurple = 0x5865F2;

  embed.setColor(panel.embed?.color ?? defaultBlurple);

  return embed;

}

// rebuild embed editor 

function buildEmbedEditorRows(panel) {

  const hasTitle = !!panel.embed?.title;

  const hasDescription = !!panel.embed?.description;

  const hasColor =

    panel.embed?.color !== null && panel.embed?.color !== undefined;

  const hasAuthor = !!panel.embed?.author?.name;

  const hasImage =

    !!panel.embed?.image || !!panel.embed?.thumbnail;

  return [

    // ROW 1
      new ActionRowBuilder().addComponents(

      new ButtonBuilder()

        .setCustomId(`apex:is:embed:set_title`)

        .setLabel(hasTitle ? `Edit Title` : `Set Title`)

        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()

        .setCustomId(`apex:is:embed:set_description`)

        .setLabel(hasDescription ? `Edit Description` : `Set Description`)

        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()

        .setCustomId(`apex:is:embed:set_color`)

        .setLabel(hasColor ? `Edit Color` : `Set Color`)

        .setStyle(ButtonStyle.Secondary)

    ),
      
      // ROW 2

    new ActionRowBuilder().addComponents(

      new ButtonBuilder()

        .setCustomId(`apex:is:embed:set_author`)

        .setLabel(hasAuthor ? `Edit Author` : `Set Author`)

        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()

        .setCustomId(`apex:is:embed:set_image`)

        .setLabel(

          hasImage

            ? `Edit Image & Thumbnail`

            : `Set Image & Thumbnail`

        )

        .setStyle(ButtonStyle.Secondary)

    ),
      
      // ROW 3 (NAV)

    new ActionRowBuilder().addComponents(

      new ButtonBuilder()

        .setCustomId(`apex:is:embed:back`)

        .setLabel(`Back`)

        .setStyle(ButtonStyle.Danger)

    )

  ];

}

async function updateEditorMessage(interaction, panelId) {

  const panel = await InteractionPanel.findById(panelId);

  if (!panel) return;

  const embed = buildEditorEmbed(panel);

  await interaction.message.edit({

  embeds: [embed],

  components: buildEmbedEditorRows(panel)

});

}

module.exports = {

  updateEditorMessage,
    
  buildEditorEmbed

};

