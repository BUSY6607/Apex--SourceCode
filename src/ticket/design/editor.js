const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require(`discord.js`);

const { createState, resetTimeout, deleteState } = require(`../../utils/ticketState`);

function buildEditorComponents(state) {

  const rows = [];

  const row1 = new ActionRowBuilder().addComponents(

    new ButtonBuilder()

      .setCustomId(`ticket_edit_title`)

      .setLabel(`Edit Title`)

      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()

      .setCustomId(`ticket_edit_description`)

      .setLabel(`Edit Description`)

      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()

      .setCustomId(`ticket_edit_color`)

      .setLabel(`Edit Color`)

      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()

      .setCustomId(`ticket_edit_image`)

      .setLabel(`Set Image`)

      .setStyle(ButtonStyle.Secondary)

  );

  const row2 = new ActionRowBuilder().addComponents(

    new ButtonBuilder()

      .setCustomId(`ticket_editor:add_category`)

      .setLabel(`Add Category`)

      .setStyle(ButtonStyle.Success),
      
      new ButtonBuilder()

  .setCustomId(`ticket_creation_mode`)

  .setLabel(`Ticket Creation Mode`)

  .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()

      .setCustomId(`ticket_save`)

      .setLabel(`Save`)

      .setStyle(ButtonStyle.Success)

  );

  rows.push(row1, row2);

  if (Array.isArray(state.categories)) {

    for (const category of state.categories) {

      rows.push(

        new ActionRowBuilder().addComponents(

          new ButtonBuilder()

            .setCustomId(`ticket_category_edit:${category.id}`)

            .setLabel(`Edit ${category.label}`)

            .setStyle(ButtonStyle.Secondary)

        )

      );

    }

  }

  return rows;

}

async function startEditor(interaction) {

  const previewEmbed = new EmbedBuilder()

    .setColor(`Blue`)

    .setTitle(`🎨 Ticket Panel Designer`)

    .setDescription(

      `Use the buttons below to design your ticket panel.\n\n` +

      `⚠️ If you stay inactive for **10 minutes**, the editor will be discarded.\n\n`

    )

    .setFooter({ text: `Apex • Ticket System` });

  const state = createState(

    interaction.guild.id,

    interaction.user.id,

    null

  );
    
    // default ticket creation mode

if (!state.ticketCreationMode) {

  state.ticketCreationMode = `select`;

}

  const msg = await interaction.reply({

    ephemeral: false,

    embeds: [previewEmbed],

    components: buildEditorComponents(state),

    fetchReply: true

  });

  state.messageId = msg.id;

  state.editorMessage.embeds = msg.embeds;

  state.editorMessage.components = msg.components;

  resetTimeout(state, async () => {

    deleteState(interaction.guild.id);

    interaction.user.send({

      embeds: [

        new EmbedBuilder()

          .setColor(`Orange`)

          .setDescription(

            `⏳ **Ticket Panel Design Discarded**\n\n` +

            `Your ticket panel design was cancelled due to **10 minutes of inactivity**.\n\n` +

            `You can restart using \`/setuptickets design\`.`

          )

          .setFooter({ text: `Apex • Ticket System` })

      ]

    }).catch(() => {});

  });

}

module.exports = {

  startEditor,

  buildEditorComponents

};
