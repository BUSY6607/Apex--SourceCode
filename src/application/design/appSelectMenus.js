const { EmbedBuilder } = require('discord.js');

const { getAppState, resetAppTimeout } = require('../../utils/appState');
const {
  buildMainEditorEmbed,
  buildMainEditorComponents,
  buildQuestionEditorEmbed,
  buildQuestionEditorComponents,
  FOOTER
} = require('./appEditorBuilder');

module.exports = async function handleAppSelectMenus(interaction) {
  const id = interaction.customId;

  // ── Color picker ─────────────────────────────────────────────────────────
  if (id === 'app_color_select') {
    const state = getAppState(interaction.guild.id);
    if (!state) return interaction.deferUpdate();
    resetAppTimeout(state, () => {});

    state.embed.color = interaction.values[0];

    // Update the main editor message
    try {
      const msg = await interaction.channel.messages.fetch(state.messageId).catch(() => null);
      if (msg) {
        await msg.edit({
          embeds:     [buildMainEditorEmbed(state)],
          components: buildMainEditorComponents(state)
        });
      }
    } catch { /* ignore */ }

    return interaction.update({
      embeds: [new EmbedBuilder().setColor('Green')
        .setDescription(`✅ Panel color set to **${state.embed.color}**.`)
        .setFooter(FOOTER)],
      components: []
    });
  }

  // ── Question selector (manage questions) ─────────────────────────────────
  if (id.startsWith('app_select_question:')) {
    const appId = id.split(':')[1];
    const state = getAppState(interaction.guild.id);
    if (!state) return interaction.deferUpdate();
    resetAppTimeout(state, () => {});

    const app  = state.applications.find(a => a.id === appId);
    const qIdx = parseInt(interaction.values[0], 10);

    if (!app || !app.questions[qIdx]) {
      return interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Question not found.').setFooter(FOOTER)]
      });
    }

    return interaction.update({
      embeds:     [buildQuestionEditorEmbed(app.questions[qIdx], qIdx)],
      components: buildQuestionEditorComponents(appId, qIdx)
    });
  }
};
