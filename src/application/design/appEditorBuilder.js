const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const FOOTER = { text: 'Apex • Application System' };

// ── Color map for EmbedBuilder ────────────────────────────────────────────────
const COLOR_MAP = {
  Blue: 0x5865F2, Green: 0x57F287, Red: 0xED4245,
  Yellow: 0xFEE75C, Purple: 0x9B59B6, Grey: 0x95A5A6,
  Orange: 0xE67E22, Gold: 0xF1C40F
};

function resolveColor(c) {
  return COLOR_MAP[c] || 0x5865F2;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EDITOR EMBED + COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
function buildMainEditorEmbed(state) {
  const appList = state.applications.length
    ? state.applications.map((a, i) =>
        `${i + 1}. **${a.label}** \`${a.id}\` — ${a.questions.length} question(s)${a.roleId ? ` | Role: <@&${a.roleId}>` : ''}`
      ).join('\n')
    : '*No applications added yet.*';

  return new EmbedBuilder()
    .setColor(resolveColor(state.embed.color))
    .setTitle('🗂️ Application Panel Editor')
    .setDescription(
      `**Panel Title:** ${state.embed.title || '*Not set*'}\n` +
      `**Description:** ${state.embed.description || '*Not set*'}\n` +
      `**Display Mode:** \`${state.embed.displayMode || state.displayMode}\`\n` +
      `**Color:** ${state.embed.color}\n\n` +
      `**Applications (${state.applications.length}):**\n${appList}\n\n` +
      `⚠️ Editor expires after **10 minutes** of inactivity.`
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

function buildMainEditorComponents(state) {
  const rows = [];

  // Row 1 — panel design controls
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('app_edit_title').setLabel('Edit Title').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('app_edit_description').setLabel('Edit Description').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('app_edit_color').setLabel('Edit Color').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('app_display_mode').setLabel('Display Mode').setStyle(ButtonStyle.Primary)
  ));

  // Row 2 — application management
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('app_add').setLabel('➕ Add Application').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('app_save').setLabel('💾 Publish Panel').setStyle(ButtonStyle.Success)
  ));

  // Row 3+ — per-application edit buttons (up to 3 per row)
  if (state.applications.length > 0) {
    let rowBtns = [];
    for (const app of state.applications) {
      rowBtns.push(
        new ButtonBuilder()
          .setCustomId(`app_edit_app:${app.id}`)
          .setLabel(`✏️ ${app.label.slice(0, 20)}`)
          .setStyle(ButtonStyle.Secondary)
      );
      if (rowBtns.length === 3) {
        rows.push(new ActionRowBuilder().addComponents(...rowBtns));
        rowBtns = [];
      }
    }
    if (rowBtns.length > 0) {
      rows.push(new ActionRowBuilder().addComponents(...rowBtns));
    }
  }

  return rows;
}

// ══════════════════════════════════════════════════════════════════════════════
// APPLICATION EDITOR (single app — edit label, role, questions)
// ══════════════════════════════════════════════════════════════════════════════
function buildAppEditorEmbed(app) {
  const qList = app.questions.length
    ? app.questions.map((q, i) =>
        `${i + 1}. **${q.label}** *(${q.style})* ${q.required ? '✅' : '⬜'}`
      ).join('\n')
    : '*No questions added yet.*';

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`✏️ Editing: ${app.label}`)
    .addFields(
      { name: '🆔 Application ID', value: `\`${app.id}\``,                               inline: true },
      { name: '🎭 Role on Accept',  value: app.roleId ? `<@&${app.roleId}>` : '*Not set*', inline: true },
      { name: '😀 Emoji',          value: app.emoji  ? app.emoji  : '*Not set*',           inline: true },
      { name: '❓ Questions',       value: qList,                                           inline: false }
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

function buildAppEditorComponents(app) {
  const rows = [];

  // Row 1 — app-level controls
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`app_edit_label:${app.id}`).setLabel('Edit Label').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`app_edit_role:${app.id}`).setLabel('Set Accept Role').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`app_set_emoji:${app.id}`).setLabel(app.emoji ? `✏️ Change Emoji` : `😀 Set Emoji`).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`app_delete_app:${app.id}`).setLabel('🗑️ Delete App').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('app_back_main').setLabel('← Back').setStyle(ButtonStyle.Secondary)
  ));

  // Row 2 — question controls
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`app_add_question:${app.id}`).setLabel('➕ Add Question').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`app_manage_questions:${app.id}`).setLabel('📋 Manage Questions').setStyle(ButtonStyle.Primary)
      .setDisabled(app.questions.length === 0)
  ));

  return rows;
}

// ══════════════════════════════════════════════════════════════════════════════
// QUESTION MANAGER (select to edit/delete a question)
// ══════════════════════════════════════════════════════════════════════════════
function buildQuestionManagerComponents(app) {
  const rows = [];

  if (app.questions.length > 0) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`app_select_question:${app.id}`)
        .setPlaceholder('Select a question to edit or delete')
        .addOptions(app.questions.map((q, i) => ({
          label: q.label.slice(0, 100),
          value: String(i),
          description: `${q.style} | ${q.required ? 'Required' : 'Optional'}`
        })))
    ));
  }

  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`app_edit_app:${app.id}`).setLabel('← Back to App').setStyle(ButtonStyle.Secondary)
  ));

  return rows;
}

// ══════════════════════════════════════════════════════════════════════════════
// QUESTION EDITOR (edit single question)
// ══════════════════════════════════════════════════════════════════════════════
function buildQuestionEditorEmbed(q, index) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`❓ Question #${index + 1}`)
    .addFields(
      { name: '📝 Label',       value: q.label,                         inline: false },
      { name: '📄 Style',       value: q.style,                         inline: true  },
      { name: '✅ Required',    value: q.required ? 'Yes' : 'No',       inline: true  },
      { name: '💬 Placeholder', value: q.placeholder || '*None*',       inline: false }
    )
    .setFooter(FOOTER);
}

function buildQuestionEditorComponents(appId, questionIndex) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`app_edit_question:${appId}:${questionIndex}`).setLabel('Edit Question').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`app_delete_question:${appId}:${questionIndex}`).setLabel('🗑️ Delete').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`app_manage_questions:${appId}`).setLabel('← Back').setStyle(ButtonStyle.Secondary)
    )
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// DISPLAY MODE SELECTOR
// ══════════════════════════════════════════════════════════════════════════════
function buildDisplayModeComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('app_mode_button').setLabel('🔘 Button Mode').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('app_mode_select').setLabel('📋 Select Menu Mode').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('app_back_main').setLabel('← Cancel').setStyle(ButtonStyle.Danger)
    )
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// COLOR SELECTOR
// ══════════════════════════════════════════════════════════════════════════════
function buildColorSelectComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('app_color_select')
        .setPlaceholder('Choose a panel color')
        .addOptions(
          { label: 'Blue',   value: 'Blue'   },
          { label: 'Green',  value: 'Green'  },
          { label: 'Red',    value: 'Red'    },
          { label: 'Yellow', value: 'Yellow' },
          { label: 'Purple', value: 'Purple' },
          { label: 'Grey',   value: 'Grey'   },
          { label: 'Orange', value: 'Orange' },
          { label: 'Gold',   value: 'Gold'   }
        )
    )
  ];
}

module.exports = {
  buildMainEditorEmbed,
  buildMainEditorComponents,
  buildAppEditorEmbed,
  buildAppEditorComponents,
  buildQuestionManagerComponents,
  buildQuestionEditorEmbed,
  buildQuestionEditorComponents,
  buildDisplayModeComponents,
  buildColorSelectComponents,
  resolveColor,
  FOOTER
};
