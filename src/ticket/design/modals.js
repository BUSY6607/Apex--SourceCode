const {

  ModalBuilder,

  TextInputBuilder,

  TextInputStyle,

  ActionRowBuilder,

  EmbedBuilder,

  StringSelectMenuBuilder

} = require(`discord.js`);

const { getState, resetTimeout } = require(`../../utils/ticketState`);

/* ================= TITLE MODAL ================= */

function showTitleModal(interaction) {

  const modal = new ModalBuilder()

    .setCustomId(`ticket_modal_title`)

    .setTitle(`Edit Ticket Panel Title`);

  const input = new TextInputBuilder()

    .setCustomId(`title`)

    .setLabel(`Panel Title`)

    .setStyle(TextInputStyle.Short)

    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));

  return interaction.showModal(modal);

}

/* ================= DESCRIPTION MODAL ================= */

function showDescriptionModal(interaction) {

  const modal = new ModalBuilder()

    .setCustomId(`ticket_modal_description`)

    .setTitle(`Edit Ticket Panel Description`);

  const input = new TextInputBuilder()

    .setCustomId(`description`)

    .setLabel(`Panel Description`)

    .setStyle(TextInputStyle.Paragraph)

    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));

  return interaction.showModal(modal);

}

/*================= ADD CATEGORY MODAL =================*/

function showAddCategoryModal(interaction, category = null) {

  const modal = new ModalBuilder()

    .setCustomId(`ticket_modal_add_category`)

    .setTitle(`Add Ticket Category`);
    
    const labelInput = new TextInputBuilder()

    .setCustomId(`category_label`)

    .setLabel(`Category Label (shown to users)`)

    .setStyle(TextInputStyle.Short)

    .setRequired(true);

  const valueInput = new TextInputBuilder()

    .setCustomId(`category_value`)

    .setLabel(`Category Value (internal, no spaces)`)

    .setStyle(TextInputStyle.Short)

    .setRequired(true);
    
    const emojiInput = new TextInputBuilder()

    .setCustomId(`category_emoji`)

    .setLabel(`Emoji (optional)`)

    .setStyle(TextInputStyle.Short)

    .setRequired(false);

  const descInput = new TextInputBuilder()

    .setCustomId(`category_description`)

    .setLabel(`Category Description`)

    .setStyle(TextInputStyle.Paragraph)

    .setRequired(false);
    
    const limitInput = new TextInputBuilder()

    .setCustomId(`category_limit`)

    .setLabel(`Max tickets per user`)

    .setStyle(TextInputStyle.Short)

    .setPlaceholder(`1`)

    .setRequired(false);
    
    // Prefill while editing

  if (category) {

    labelInput.setValue(category.label);

    valueInput.setValue(category.value);

    if (category.emoji) emojiInput.setValue(category.emoji);

    if (category.description) descInput.setValue(category.description);

    limitInput.setValue(String(category.maxTickets ?? 1));

  }
    
    modal.addComponents(

    new ActionRowBuilder().addComponents(labelInput),

    new ActionRowBuilder().addComponents(valueInput),

    new ActionRowBuilder().addComponents(emojiInput),

    new ActionRowBuilder().addComponents(descInput),

    new ActionRowBuilder().addComponents(limitInput)

  );

  return interaction.showModal(modal);

}

/* ================= COLOR SELECT MENU ================= */

function showColorSelect(interaction) {

  const row = new ActionRowBuilder().addComponents(

    new StringSelectMenuBuilder()

      .setCustomId(`ticket_color_select`)

      .setPlaceholder(`Choose an embed color`)

      .addOptions(

        { label: `Blue`, value: `Blue` },

        { label: `Green`, value: `Green` },

        { label: `Red`, value: `Red` },

        { label: `Yellow`, value: `Yellow` },

        { label: `Purple`, value: `Purple` },

        { label: `Grey`, value: `Grey` },

        { label: `Reset to Default`, value: `RESET` }

      )

  );

  return interaction.reply({

    ephemeral: true,

    content: `🎨 Select a color for the ticket panel embed`,

    components: [row]

  });

}

/* ================= HANDLE COLOR SELECT ================= */

async function handleColorSelect(interaction) {

  const state = getState(interaction.guild.id);

  if (!state) {

    return interaction.deferUpdate();

  }

  resetTimeout(state, () => {});

  const value = interaction.values[0];

  state.embed.color = value === `RESET` ? `Blue` : value;

  const preview = new EmbedBuilder()

    .setColor(state.embed.color || `Blue`)

    .setTitle(state.embed.title)

    .setDescription(state.embed.description)

    .setFooter({ text: `Apex • Ticket System` });

  if (state.embed.image) {

    preview.setImage(state.embed.image);

  }

  await interaction.update({

    embeds: [preview],

    components: interaction.message.components

  });

}

/* ================= HANDLE MODALS (TITLE / DESC) ================= */

async function handleModal(interaction) {

  const state = getState(interaction.guild.id);

  if (!state) return;
    
    if (!Array.isArray(state.categories)) {

  state.categories = [];

}

  resetTimeout(state, () => {});

  if (interaction.customId === `ticket_modal_title`) {

    state.embed.title = interaction.fields.getTextInputValue(`title`);

  }

  if (interaction.customId === `ticket_modal_description`) {

    state.embed.description =

      interaction.fields.getTextInputValue(`description`);

  }
    
    /* ================= HANDLE ADD CATEGORY MODAL ================= */

if (interaction.customId === `ticket_modal_add_category`) {

  const label =

    interaction.fields.getTextInputValue(`category_label`);

  const rawValue =

    interaction.fields.getTextInputValue(`category_value`);

  const value = rawValue

    .toLowerCase()

    .replace(/\s+/g, `_`)

    .replace(/[^a-z0-9_]/g, ``);
    
    const emoji =

    interaction.fields.getTextInputValue(`category_emoji`) || null;

  const description =

    interaction.fields.getTextInputValue(`category_description`) || null;

  const limitRaw =

    interaction.fields.getTextInputValue(`category_limit`);

  const maxTickets = Number(limitRaw) || 1;

  if (state.editingCategoryId) {

    const category = state.categories.find(

      c => c.id === state.editingCategoryId

    );
    
    if (category) {

      category.label = label;

      category.value = value;

      category.emoji = emoji;

      category.description = description;

      category.maxTickets = maxTickets;

    }

    delete state.editingCategoryId;

  } else {

    state.categories.push({

      id: Date.now().toString(),

      label,

      value,

      emoji,

      description,

      maxTickets

    });

  }

}

  // preview embed
    const preview = new EmbedBuilder()

    .setColor(state.embed.color || `Blue`)

    .setTitle(state.embed.title)

    const categoryText = state.categories.length

  ? state.categories

      .map(

        (c, i) =>

          `${i + 1}. **${c.label}**\n🆔 ${c.value}\n🎫 Limit: ${c.maxTickets}`

      )

      .join(`\n\n`)

  : `No categories created yet.`;

preview.setDescription(

  `${state.embed.description || ``}

🧩 Ticket Categories

━━━━━━━━━━━━━━━━━━

${categoryText}`

)

    .setFooter({ text: `Apex • Ticket System` });

  if (state.embed.image) {

    preview.setImage(state.embed.image);

  }

  const { buildEditorComponents } = require(`./editor`);

await interaction.message.edit({

  embeds: [preview],

  components: buildEditorComponents(state)

});

return interaction.reply({

  ephemeral: true,

  content: `✅ Category saved`

});

}

/* ================= EXPORTS ================= */

module.exports = {

  showTitleModal,

  showDescriptionModal,
    
  showAddCategoryModal,

  showColorSelect,

  handleColorSelect,

  handleModal

};

