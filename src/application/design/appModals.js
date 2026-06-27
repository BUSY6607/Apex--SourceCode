const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require('discord.js');

const { getAppState, resetAppTimeout } = require('../../utils/appState');
const {
  buildMainEditorEmbed,
  buildMainEditorComponents,
  buildAppEditorEmbed,
  buildAppEditorComponents,
  FOOTER
} = require('./appEditorBuilder');

// ── Shared: reply ephemeral error ─────────────────────────────────────────────
function err(interaction, desc) {
  return interaction.reply({
    ephemeral: true,
    embeds: [new EmbedBuilder().setColor('Red').setDescription(desc).setFooter(FOOTER)]
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL BUILDERS
// ══════════════════════════════════════════════════════════════════════════════

function showTitleModal(interaction) {
  const modal = new ModalBuilder().setCustomId('app_modal_title').setTitle('Edit Panel Title');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('title').setLabel('Panel Title')
      .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(256)
  ));
  return interaction.showModal(modal);
}

function showDescriptionModal(interaction) {
  const modal = new ModalBuilder().setCustomId('app_modal_description').setTitle('Edit Panel Description');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('description').setLabel('Panel Description')
      .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000)
  ));
  return interaction.showModal(modal);
}

function showAddApplicationModal(interaction, existing = null) {
  const modal = new ModalBuilder()
    .setCustomId(existing ? `app_modal_edit_app:${existing.id}` : 'app_modal_add_app')
    .setTitle(existing ? 'Edit Application' : 'Add Application');

  const labelInput = new TextInputBuilder()
    .setCustomId('app_label').setLabel('Application Name (shown to users)')
    .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80);

  const descInput = new TextInputBuilder()
    .setCustomId('app_description').setLabel('Description (for select menu, optional)')
    .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100);

  if (existing) {
    labelInput.setValue(existing.label);
    if (existing.description) descInput.setValue(existing.description);
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(labelInput),
    new ActionRowBuilder().addComponents(descInput)
  );

  return interaction.showModal(modal);
}

function showSetRoleModal(interaction, appId) {
  const modal = new ModalBuilder()
    .setCustomId(`app_modal_set_role:${appId}`)
    .setTitle('Set Accept Role');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('role_id')
      .setLabel('Role ID or mention (@RoleName)')
      .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)
      .setPlaceholder('Paste role ID or type @RoleName')
  ));
  return interaction.showModal(modal);
}

function showAddQuestionModal(interaction, appId, existing = null, questionIndex = null) {
  const isEdit = existing !== null;
  const modal = new ModalBuilder()
    .setCustomId(isEdit ? `app_modal_edit_question:${appId}:${questionIndex}` : `app_modal_add_question:${appId}`)
    .setTitle(isEdit ? `Edit Question #${questionIndex + 1}` : 'Add Question');

  const labelInput = new TextInputBuilder()
    .setCustomId('q_label').setLabel('Question text shown in the modal')
    .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(45);

  const styleInput = new TextInputBuilder()
    .setCustomId('q_style').setLabel('Style: "short" or "paragraph"')
    .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(9)
    .setPlaceholder('paragraph');

  const requiredInput = new TextInputBuilder()
    .setCustomId('q_required').setLabel('Required? (yes / no)')
    .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3)
    .setPlaceholder('yes');

  const placeholderInput = new TextInputBuilder()
    .setCustomId('q_placeholder').setLabel('Placeholder text (optional)')
    .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100);

  if (isEdit) {
    labelInput.setValue(existing.label);
    styleInput.setValue(existing.style);
    requiredInput.setValue(existing.required ? 'yes' : 'no');
    if (existing.placeholder) placeholderInput.setValue(existing.placeholder);
  }

  modal.addComponents(
    new ActionRowBuilder().addComponents(labelInput),
    new ActionRowBuilder().addComponents(styleInput),
    new ActionRowBuilder().addComponents(requiredInput),
    new ActionRowBuilder().addComponents(placeholderInput)
  );

  return interaction.showModal(modal);
}

function showRejectReasonModal(interaction, subId) {
  const modal = new ModalBuilder()
    .setCustomId(`app:reject_reason:${subId}`)
    .setTitle('Reject Application');
  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId('reason').setLabel('Rejection Reason')
      .setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
  ));
  return interaction.showModal(modal);
}

// ══════════════════════════════════════════════════════════════════════════════
// MODAL SUBMIT HANDLER
// ══════════════════════════════════════════════════════════════════════════════
async function handleAppModalSubmit(interaction) {
  const id = interaction.customId;

  // ── Panel title ─────────────────────────────────────────────────────────
  if (id === 'app_modal_title') {
    const state = getAppState(interaction.guild.id);
    if (!state) return err(interaction, '❌ Editor session expired. Run `/application design` again.');
    resetAppTimeout(state, () => {});
    state.embed.title = interaction.fields.getTextInputValue('title').trim();
    const embed  = buildMainEditorEmbed(state);
    const comps  = buildMainEditorComponents(state);
    await interaction.message.edit({ embeds: [embed], components: comps });
    return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder().setColor('Green').setDescription('✅ Panel title updated.').setFooter(FOOTER)] });
  }

  // ── Panel description ────────────────────────────────────────────────────
  if (id === 'app_modal_description') {
    const state = getAppState(interaction.guild.id);
    if (!state) return err(interaction, '❌ Editor session expired. Run `/application design` again.');
    resetAppTimeout(state, () => {});
    state.embed.description = interaction.fields.getTextInputValue('description').trim();
    const embed  = buildMainEditorEmbed(state);
    const comps  = buildMainEditorComponents(state);
    await interaction.message.edit({ embeds: [embed], components: comps });
    return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder().setColor('Green').setDescription('✅ Panel description updated.').setFooter(FOOTER)] });
  }

  // ── Add new application ──────────────────────────────────────────────────
  if (id === 'app_modal_add_app') {
    const state = getAppState(interaction.guild.id);
    if (!state) return err(interaction, '❌ Editor session expired.');
    resetAppTimeout(state, () => {});

    if (state.applications.length >= 10) {
      return err(interaction, '❌ Maximum of 10 applications per panel.');
    }

    const { genId } = require('../../utils/appState');
    const label       = interaction.fields.getTextInputValue('app_label').trim();
    const description = interaction.fields.getTextInputValue('app_description').trim() || null;
    const newApp      = { id: genId('APP'), label, description, emoji: null, roleId: null, questions: [] };

    state.applications.push(newApp);
    state.editingAppId = newApp.id;
    state.editorMode   = 'app_editor';

    const embed = buildAppEditorEmbed(newApp);
    const comps = buildAppEditorComponents(newApp);
    await interaction.message.edit({ embeds: [embed], components: comps });
    return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder().setColor('Green').setDescription(`✅ Application **${label}** created. Now configure it below.`).setFooter(FOOTER)] });
  }

  // ── Edit existing application label/desc/emoji ────────────────────────────
  if (id.startsWith('app_modal_edit_app:')) {
    const appId = id.split(':')[1];
    const state = getAppState(interaction.guild.id);
    if (!state) return err(interaction, '❌ Editor session expired.');
    resetAppTimeout(state, () => {});

    const app = state.applications.find(a => a.id === appId);
    if (!app) return err(interaction, '❌ Application not found.');

    app.label       = interaction.fields.getTextInputValue('app_label').trim();
    app.description = interaction.fields.getTextInputValue('app_description').trim() || null;

    const embed = buildAppEditorEmbed(app);
    const comps = buildAppEditorComponents(app);
    await interaction.message.edit({ embeds: [embed], components: comps });
    return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder().setColor('Green').setDescription('✅ Application updated.').setFooter(FOOTER)] });
  }

  // ── Set accept role ───────────────────────────────────────────────────────
  if (id.startsWith('app_modal_set_role:')) {
    const appId = id.split(':')[1];
    const state = getAppState(interaction.guild.id);
    if (!state) return err(interaction, '❌ Editor session expired.');
    resetAppTimeout(state, () => {});

    const rawInput = interaction.fields.getTextInputValue('role_id').trim();

    // Extract raw ID — strip <@& > mention wrapper if present
    const roleIdClean = rawInput.replace(/^<@&(\d+)>$/, '$1').trim();

    // Try cache first, then fetch
    let role = interaction.guild.roles.cache.get(roleIdClean);

    if (!role) {
      // Fetch all roles if not in cache (fixes the "role not found" bug)
      await interaction.guild.roles.fetch();
      role = interaction.guild.roles.cache.get(roleIdClean);
    }

    // If still not found, try matching by name (case-insensitive)
    if (!role) {
      role = interaction.guild.roles.cache.find(
        r => r.name.toLowerCase() === roleIdClean.toLowerCase()
      );
    }

    if (!role) {
      return err(interaction,
        `❌ Role not found.\n\n` +
        `**How to get the Role ID:**\n` +
        `1. Enable Developer Mode in Discord Settings → Advanced\n` +
        `2. Right-click the role in Server Settings → Roles\n` +
        `3. Click **Copy Role ID**\n\n` +
        `You entered: \`${rawInput}\``
      );
    }

    const app = state.applications.find(a => a.id === appId);
    if (!app) return err(interaction, '❌ Application not found.');

    app.roleId = role.id;

    const embed = buildAppEditorEmbed(app);
    const comps = buildAppEditorComponents(app);
    await interaction.message.edit({ embeds: [embed], components: comps });
    return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder().setColor('Green').setDescription(`✅ Accept role set to <@&${role.id}> (**${role.name}**).`).setFooter(FOOTER)] });
  }

  // ── Add question ─────────────────────────────────────────────────────────
  if (id.startsWith('app_modal_add_question:')) {
    const appId = id.split(':')[1];
    const state = getAppState(interaction.guild.id);
    if (!state) return err(interaction, '❌ Editor session expired.');
    resetAppTimeout(state, () => {});

    const app = state.applications.find(a => a.id === appId);
    if (!app) return err(interaction, '❌ Application not found.');

    if (app.questions.length >= 5) {
      return err(interaction, '❌ Maximum of 5 questions per application (Discord modal limit).');
    }

    const label       = interaction.fields.getTextInputValue('q_label').trim();
    const styleRaw    = interaction.fields.getTextInputValue('q_style').trim().toLowerCase();
    const style       = ['short', 'paragraph'].includes(styleRaw) ? styleRaw : 'paragraph';
    const requiredRaw = interaction.fields.getTextInputValue('q_required').trim().toLowerCase();
    const required    = requiredRaw !== 'no';
    const placeholder = interaction.fields.getTextInputValue('q_placeholder').trim() || null;
    const { genId }   = require('../../utils/appState');

    app.questions.push({ id: genId('Q'), label, style, required, placeholder });

    const embed = buildAppEditorEmbed(app);
    const comps = buildAppEditorComponents(app);
    await interaction.message.edit({ embeds: [embed], components: comps });
    return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder().setColor('Green').setDescription(`✅ Question added. (${app.questions.length}/5)`).setFooter(FOOTER)] });
  }

  // ── Edit existing question ────────────────────────────────────────────────
  if (id.startsWith('app_modal_edit_question:')) {
    const parts = id.split(':');
    const appId = parts[1];
    const qIdx  = parseInt(parts[2], 10);
    const state = getAppState(interaction.guild.id);
    if (!state) return err(interaction, '❌ Editor session expired.');
    resetAppTimeout(state, () => {});

    const app = state.applications.find(a => a.id === appId);
    if (!app || !app.questions[qIdx]) return err(interaction, '❌ Question not found.');

    const label       = interaction.fields.getTextInputValue('q_label').trim();
    const styleRaw    = interaction.fields.getTextInputValue('q_style').trim().toLowerCase();
    const style       = ['short', 'paragraph'].includes(styleRaw) ? styleRaw : 'paragraph';
    const requiredRaw = interaction.fields.getTextInputValue('q_required').trim().toLowerCase();
    const required    = requiredRaw !== 'no';
    const placeholder = interaction.fields.getTextInputValue('q_placeholder').trim() || null;

    app.questions[qIdx] = { ...app.questions[qIdx], label, style, required, placeholder };

    const {
      buildQuestionEditorEmbed,
      buildQuestionEditorComponents
    } = require('./appEditorBuilder');

    const embed = buildQuestionEditorEmbed(app.questions[qIdx], qIdx);
    const comps = buildQuestionEditorComponents(appId, qIdx);
    await interaction.message.edit({ embeds: [embed], components: comps });
    return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder().setColor('Green').setDescription('✅ Question updated.').setFooter(FOOTER)] });
  }
}

module.exports = {
  showTitleModal,
  showDescriptionModal,
  showAddApplicationModal,
  showSetRoleModal,
  showAddQuestionModal,
  showRejectReasonModal,
  handleAppModalSubmit
};
