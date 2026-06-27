const { EmbedBuilder } = require('discord.js');

const { getAppState, deleteAppState, resetAppTimeout } = require('../../utils/appState');
const {
  buildMainEditorEmbed,
  buildMainEditorComponents,
  buildAppEditorEmbed,
  buildAppEditorComponents,
  buildQuestionManagerComponents,
  buildQuestionEditorEmbed,
  buildQuestionEditorComponents,
  buildDisplayModeComponents,
  buildColorSelectComponents,
  FOOTER
} = require('./appEditorBuilder');

const {
  showTitleModal,
  showDescriptionModal,
  showAddApplicationModal,
  showSetRoleModal,
  showAddQuestionModal
} = require('./appModals');

const publishAppPanel = require('./appPublish');

// ── Shared error helper ───────────────────────────────────────────────────────
function err(interaction, desc) {
  return interaction.reply({
    ephemeral: true,
    embeds: [new EmbedBuilder().setColor('Red').setDescription(desc).setFooter(FOOTER)]
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN BUTTON ROUTER
// ══════════════════════════════════════════════════════════════════════════════
module.exports = async function handleAppButtons(interaction) {
  const state = getAppState(interaction.guild.id);

  if (!state || interaction.user.id !== state.adminId) {
    return err(interaction, '❌ This editor session is no longer active or belongs to another admin.');
  }

  resetAppTimeout(state, async () => {
    deleteAppState(interaction.guild.id);
    interaction.user.send({
      embeds: [new EmbedBuilder().setColor('Orange')
        .setDescription('⏳ **Application Editor Expired**\n\nYour editor was discarded due to 10 minutes of inactivity.\n\nRun `/application design` to start again.')
        .setFooter(FOOTER)]
    }).catch(() => {});
  });

  const id = interaction.customId;

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN EDITOR BUTTONS
  // ══════════════════════════════════════════════════════════════════════════

  if (id === 'app_edit_title')       return showTitleModal(interaction);
  if (id === 'app_edit_description') return showDescriptionModal(interaction);

  // ── Color picker ─────────────────────────────────────────────────────────
  if (id === 'app_edit_color') {
    return interaction.reply({
      ephemeral: true,
      embeds: [new EmbedBuilder().setColor('Blue').setDescription('🎨 Select a color for the panel embed').setFooter(FOOTER)],
      components: buildColorSelectComponents()
    });
  }

  // ── Display mode ─────────────────────────────────────────────────────────
  if (id === 'app_display_mode') {
    return interaction.update({
      embeds: [new EmbedBuilder().setColor('Blue')
        .setTitle('🖥️ Select Display Mode')
        .setDescription(
          '**Button Mode** — Each application is a button on the panel.\n' +
          '**Select Menu Mode** — All applications are in a single dropdown.\n\n' +
          '*Select Menu Mode supports descriptions and is recommended for 3+ applications.*'
        ).setFooter(FOOTER)],
      components: buildDisplayModeComponents()
    });
  }

  // ── Add application ───────────────────────────────────────────────────────
  if (id === 'app_add') {
    if (state.applications.length >= 10) {
      return err(interaction, '❌ Maximum of 10 applications per panel.');
    }
    return showAddApplicationModal(interaction);
  }

  // ── Publish ───────────────────────────────────────────────────────────────
  if (id === 'app_save') {
    if (state.applications.length === 0) {
      return err(interaction, '❌ Add at least one application before publishing.');
    }
    const hasEmpty = state.applications.find(a => a.questions.length === 0);
    if (hasEmpty) {
      return err(interaction, `❌ Application **${hasEmpty.label}** has no questions. Add at least one question before publishing.`);
    }

    // Confirm step
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    return interaction.update({
      embeds: [new EmbedBuilder().setColor('Orange')
        .setTitle('⚠️ Confirm Publish')
        .setDescription(
          `You are about to publish the application panel with **${state.applications.length}** application(s).\n\n` +
          `This will send the panel to the configured review channel and make it live.\n\n` +
          `**Are you sure?**`
        ).setFooter(FOOTER)],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('app_confirm_publish').setLabel('✅ Confirm Publish').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('app_back_main').setLabel('← Continue Editing').setStyle(ButtonStyle.Secondary)
      )]
    });
  }

  // ── Confirm publish ───────────────────────────────────────────────────────
  if (id === 'app_confirm_publish') return publishAppPanel(interaction, state);

  // ── Back to main editor ───────────────────────────────────────────────────
  if (id === 'app_back_main') {
    state.editorMode   = null;
    state.editingAppId = null;
    const embed = buildMainEditorEmbed(state);
    const comps = buildMainEditorComponents(state);
    return interaction.update({ embeds: [embed], components: comps });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DISPLAY MODE SELECTION
  // ══════════════════════════════════════════════════════════════════════════

  if (id === 'app_mode_button') {
    state.displayMode = 'button';
    const embed = buildMainEditorEmbed(state);
    const comps = buildMainEditorComponents(state);
    return interaction.update({ embeds: [embed], components: comps });
  }

  if (id === 'app_mode_select') {
    state.displayMode = 'select';
    const embed = buildMainEditorEmbed(state);
    const comps = buildMainEditorComponents(state);
    return interaction.update({ embeds: [embed], components: comps });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // APPLICATION-LEVEL BUTTONS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Open app editor ───────────────────────────────────────────────────────
  if (id.startsWith('app_edit_app:')) {
    const appId = id.split(':')[1];
    const app   = state.applications.find(a => a.id === appId);
    if (!app) return err(interaction, '❌ Application not found.');

    state.editorMode   = 'app_editor';
    state.editingAppId = appId;

    return interaction.update({
      embeds:     [buildAppEditorEmbed(app)],
      components: buildAppEditorComponents(app)
    });
  }

  // ── Set emoji (message-based input) ─────────────────────────────────────
  if (id.startsWith('app_set_emoji:')) {
    const appId = id.split(':')[1];
    const app   = state.applications.find(a => a.id === appId);
    if (!app) return err(interaction, '❌ Application not found.');

    // Set pending emoji state so messageCreate can capture next message
    state.pendingEmoji = {
      appId,
      editorMessageId: state.messageId
    };

    return interaction.reply({
      ephemeral: true,
      embeds: [new EmbedBuilder()
        .setColor('Blue')
        .setTitle('😀 Set Emoji')
        .setDescription(
          `Send your emoji as a message in **this channel** now.\n\n` +
          `**Accepted formats:**\n` +
          `• Unicode emoji — just type or paste it: \`🎮\`\n` +
          `• Custom server emoji — type it normally: \`:youtube:\`\n\n` +
          `Type \`remove\` to clear the current emoji.\n` +
          `This prompt expires in **2 minutes**.`
        )
        .setFooter(FOOTER)]
    });
  }

  // ── Edit label/desc/emoji of existing app ─────────────────────────────────
  if (id.startsWith('app_edit_label:')) {
    const appId = id.split(':')[1];
    const app   = state.applications.find(a => a.id === appId);
    if (!app) return err(interaction, '❌ Application not found.');
    return showAddApplicationModal(interaction, app);
  }

  // ── Set accept role ───────────────────────────────────────────────────────
  if (id.startsWith('app_edit_role:')) {
    const appId = id.split(':')[1];
    return showSetRoleModal(interaction, appId);
  }

  // ── Delete application ────────────────────────────────────────────────────
  if (id.startsWith('app_delete_app:')) {
    const appId = id.split(':')[1];
    const idx   = state.applications.findIndex(a => a.id === appId);
    if (idx === -1) return err(interaction, '❌ Application not found.');

    const label = state.applications[idx].label;
    state.applications.splice(idx, 1);
    state.editorMode   = null;
    state.editingAppId = null;

    const embed = buildMainEditorEmbed(state);
    const comps = buildMainEditorComponents(state);
    await interaction.update({ embeds: [embed], components: comps });
    return interaction.followUp({ ephemeral: true, embeds: [new EmbedBuilder().setColor('Orange').setDescription(`🗑️ Application **${label}** deleted.`).setFooter(FOOTER)] });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // QUESTION MANAGEMENT BUTTONS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Add question ─────────────────────────────────────────────────────────
  if (id.startsWith('app_add_question:')) {
    const appId = id.split(':')[1];
    const app   = state.applications.find(a => a.id === appId);
    if (!app) return err(interaction, '❌ Application not found.');
    if (app.questions.length >= 5) return err(interaction, '❌ Maximum 5 questions per application.');
    return showAddQuestionModal(interaction, appId);
  }

  // ── Open question manager ────────────────────────────────────────────────
  if (id.startsWith('app_manage_questions:')) {
    const appId = id.split(':')[1];
    const app   = state.applications.find(a => a.id === appId);
    if (!app) return err(interaction, '❌ Application not found.');
    if (app.questions.length === 0) return err(interaction, '❌ No questions to manage yet.');

    state.editorMode = 'question_manager';

    return interaction.update({
      embeds: [buildAppEditorEmbed(app)],
      components: buildQuestionManagerComponents(app)
    });
  }

  // ── Edit specific question ────────────────────────────────────────────────
  if (id.startsWith('app_edit_question:')) {
    const parts = id.split(':');
    const appId = parts[1];
    const qIdx  = parseInt(parts[2], 10);
    const app   = state.applications.find(a => a.id === appId);
    if (!app || !app.questions[qIdx]) return err(interaction, '❌ Question not found.');
    return showAddQuestionModal(interaction, appId, app.questions[qIdx], qIdx);
  }

  // ── Delete specific question ──────────────────────────────────────────────
  if (id.startsWith('app_delete_question:')) {
    const parts = id.split(':');
    const appId = parts[1];
    const qIdx  = parseInt(parts[2], 10);
    const app   = state.applications.find(a => a.id === appId);
    if (!app || !app.questions[qIdx]) return err(interaction, '❌ Question not found.');

    app.questions.splice(qIdx, 1);

    if (app.questions.length === 0) {
      // Back to app editor if no questions left
      return interaction.update({
        embeds:     [buildAppEditorEmbed(app)],
        components: buildAppEditorComponents(app)
      });
    }

    return interaction.update({
      embeds:     [buildAppEditorEmbed(app)],
      components: buildQuestionManagerComponents(app)
    });
  }
};
