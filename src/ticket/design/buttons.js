const {

  EmbedBuilder,

  ActionRowBuilder,

  ButtonBuilder,

  ButtonStyle

} = require(`discord.js`);

const {

  getState,

  resetTimeout

} = require(`../../utils/ticketState`);

const publishPanel = require(`./publish`);

module.exports = async function handleButtons(interaction) {

  const state = getState(interaction.guild.id);

  // safety

  if (!state || interaction.user.id !== state.adminId) {

    return interaction.reply({

      ephemeral: true,

      embeds: [

        new EmbedBuilder()

          .setColor(`Red`)

          .setDescription(`❌ This editor session is no longer active.`)

          .setFooter({ text: `Apex • Ticket System` })

      ]

    });

  }

  // reset inactivity timer

  resetTimeout(state, () => {});

  const id = interaction.customId;
    
    // ================= TICKET CREATION MODE =================

if (id === `ticket_creation_mode`) {

  return interaction.update({

    embeds: interaction.message.embeds,

    components: [

      new ActionRowBuilder().addComponents(

        new ButtonBuilder()

          .setCustomId(`ticket_mode_select`)

          .setLabel(`Select Menu (Default)`)

          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()

          .setCustomId(`ticket_mode_buttons`)

          .setLabel(`Buttons`)

          .setStyle(ButtonStyle.Secondary)

      )

    ]

  });

}
    
    if (id === `ticket_mode_select`) {

  state.ticketCreationMode = `select`;

  const { buildEditorComponents } = require(`./editor`);

  return interaction.update({

    embeds: interaction.message.embeds,

    components: buildEditorComponents(state)

  });

}
    
    if (id === `ticket_mode_buttons`) {

  state.ticketCreationMode = `buttons`;

  const { buildEditorComponents } = require(`./editor`);

  return interaction.update({

    embeds: interaction.message.embeds,

    components: buildEditorComponents(state)

  });

}
    
    // ================= EDIT CATEGORY BUTTON =================

if (id.startsWith(`ticket_category_edit:`)) {

  const categoryId = id.split(`:`)[1];

  const category = state.categories?.find(c => c.id === categoryId);

  if (!category) {

    return interaction.deferUpdate();

  }

  // mark edit mode

  state.editingCategoryId = categoryId;

  const { showAddCategoryModal } = require(`./modals`);

  return showAddCategoryModal(interaction, category);

}

  // EDIT TITLE

  if (id === `ticket_edit_title`) {

    const { showTitleModal } = require(`./modals`);

    return showTitleModal(interaction);

  }

  // EDIT DESCRIPTION

  if (id === `ticket_edit_description`) {

    const { showDescriptionModal } = require(`./modals`);

    return showDescriptionModal(interaction);

  }

  // MANAGE COLOR
    if (id === `ticket_edit_color`) {

  const { showColorSelect } = require(`./modals`);

  return showColorSelect(interaction);

}
    
    // MANAGE IMAGE 
    if (id === `ticket_edit_image`) {

  await interaction.reply({

    ephemeral: true,

    embeds: [ new EmbedBuilder()
             .setColor(`Blue`) .setTitle(`Image Manager`)
      .setDescription(`🖼️ **Set Panel Image**\n\n` +

      `• Send an **image URL** or **upload an image**\n` +

      `• Type \`remove\` to remove current image`) ]

  });

}
    
    //MANAGE CATEGORIEs

if (id === `ticket_editor:add_category`) {

  const { showAddCategoryModal } = require(`./modals`);

  return showAddCategoryModal(interaction);

}
    
    // SAVE → CONFIRM FLOW

if (id === `ticket_save`) {

  const confirmRow = new ActionRowBuilder().addComponents(

    new ButtonBuilder()

      .setCustomId(`ticket_confirm_save`)

      .setLabel(`Confirm Save`)

      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()

      .setCustomId(`ticket_continue_editing`)

      .setLabel(`Continue Editing`)

      .setStyle(ButtonStyle.Secondary)

  );

  return interaction.update({

    embeds: [

      new EmbedBuilder()

        .setColor(`Orange`)

        .setDescription(

          `⚠️ **Confirm Ticket Panel Save**\n\n` +

          `Are you sure you want to publish this ticket panel?\n\n` +

          `This will remove the editor and make the panel live.`

        )

        .setFooter({ text: `Apex • Ticket System` })

    ],

    components: [confirmRow]

  });

}
    
    // CONFIRM SAVE

if (id === `ticket_confirm_save`) {

  return publishPanel(interaction, state);

}
    
    // CONTINUE EDITING

if (id === `ticket_continue_editing`) {

  return interaction.update({

    embeds: state.editorMessage.embeds,

    components: state.editorMessage.components

  });

}

};

