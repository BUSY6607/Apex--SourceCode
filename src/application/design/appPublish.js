const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const ApplicationConfig = require('../../models/ApplicationConfig');
const { deleteAppState, resetAppTimeout } = require('../../utils/appState');
const { resolveColor, FOOTER } = require('./appEditorBuilder');

// ── Build the live panel components from config ───────────────────────────────
function buildLivePanelComponents(config) {
  const rows = [];

  if (config.displayMode === 'button') {
    let rowBtns = [];
    for (const app of config.applications) {
      const btn = new ButtonBuilder()
        .setCustomId(`app:apply:${app.id}`)
        .setLabel(app.label)
        .setStyle(ButtonStyle.Secondary);  // ← grey, like ticket system

      if (app.emoji) {
        try { btn.setEmoji(app.emoji); } catch { /* ignore invalid emoji */ }
      }

      rowBtns.push(btn);
      if (rowBtns.length === 5) {
        rows.push(new ActionRowBuilder().addComponents(...rowBtns));
        rowBtns = [];
      }
    }
    if (rowBtns.length > 0) rows.push(new ActionRowBuilder().addComponents(...rowBtns));

  } else {
    // Select menu mode
    const options = config.applications.map(app => {
      const opt = { label: app.label, value: app.id };
      if (app.description) opt.description = app.description.slice(0, 100);
      if (app.emoji)       opt.emoji       = app.emoji;
      return opt;
    });

    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('app:select')
        .setPlaceholder('Choose an application to apply for...')
        .addOptions(options)
    ));
  }

  return rows;
}

// ── Build the live panel embed ────────────────────────────────────────────────
function buildLivePanelEmbed(config) {
  const embed = new EmbedBuilder()
    .setColor(resolveColor(config.panelEmbed.color))
    .setTitle(config.panelEmbed.title || '📋 Applications')
    .setDescription(config.panelEmbed.description || 'Select an application below to apply.')
    .setFooter(FOOTER)
    .setTimestamp();

  if (config.panelEmbed.image) embed.setImage(config.panelEmbed.image);

  return embed;
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLISH
// ══════════════════════════════════════════════════════════════════════════════
module.exports = async function publishAppPanel(interaction, state) {
  try {
    const ApplicationConfig = require('../../models/ApplicationConfig');

    // Fetch or create guild config
    let config = await ApplicationConfig.findOne({ guildId: interaction.guild.id });
    if (!config) {
      return interaction.update({
        embeds: [new EmbedBuilder().setColor('Red')
          .setDescription('❌ Run `/application setup` first to configure the review channel.')
          .setFooter(FOOTER)],
        components: []
      });
    }

    if (!config.reviewChannelId) {
      return interaction.update({
        embeds: [new EmbedBuilder().setColor('Red')
          .setDescription('❌ No review channel configured. Run `/application setup` first.')
          .setFooter(FOOTER)],
        components: []
      });
    }

    // Fetch the panel channel (review channel doubles as host for the panel in most setups,
    // but we allow a separate panelChannelId if set, otherwise use review channel)
    const panelChannelId = config.panelChannelId || config.reviewChannelId;
    const panelChannel = interaction.guild.channels.cache.get(panelChannelId)
      || await interaction.guild.channels.fetch(panelChannelId).catch(() => null);

    if (!panelChannel) {
      return interaction.update({
        embeds: [new EmbedBuilder().setColor('Red')
          .setDescription('❌ Panel channel not found. Please re-run `/application setup`.')
          .setFooter(FOOTER)],
        components: []
      });
    }

    // Save panel design to DB
    config.panelEmbed    = { ...state.embed };
    config.displayMode   = state.displayMode;
    config.applications  = state.applications;
    config.isLive        = true;
    await config.save();

    // Delete old panel message if exists
    if (config.panelMessageId) {
      const oldMsg = await panelChannel.messages.fetch(config.panelMessageId).catch(() => null);
      if (oldMsg) await oldMsg.delete().catch(() => {});
    }

    // Send new live panel
    const panelMsg = await panelChannel.send({
      embeds:     [buildLivePanelEmbed(config)],
      components: buildLivePanelComponents(config)
    });

    config.panelMessageId = panelMsg.id;
    await config.save();

    deleteAppState(interaction.guild.id);

    return interaction.update({
      embeds: [new EmbedBuilder().setColor('Green')
        .setTitle('✅ Application Panel Published')
        .setDescription(
          `Your application panel is now live in ${panelChannel}.\n\n` +
          `**Applications:** ${state.applications.length}\n` +
          `**Mode:** ${state.displayMode === 'button' ? 'Button' : 'Select Menu'}`
        ).setFooter(FOOTER)],
      components: []
    });

  } catch (err) {
    console.error('[AppPublish] Error:', err);
    return interaction.update({
      embeds: [new EmbedBuilder().setColor('Red')
        .setDescription('❌ Failed to publish panel. Check bot permissions and try again.')
        .setFooter(FOOTER)],
      components: []
    });
  }
};

module.exports.buildLivePanelComponents = buildLivePanelComponents;
module.exports.buildLivePanelEmbed      = buildLivePanelEmbed;
