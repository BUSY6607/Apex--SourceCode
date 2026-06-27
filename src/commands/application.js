const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
} = require('discord.js');

const ApplicationConfig     = require('../models/ApplicationConfig');
const ApplicationSubmission = require('../models/ApplicationSubmission');
const { getAppState, createAppState, deleteAppState, resetAppTimeout } = require('../utils/appState');
const {
  buildMainEditorEmbed,
  buildMainEditorComponents,
  FOOTER
} = require('../application/design/appEditorBuilder');

module.exports = {
  name: 'application',
  description: 'Manage the Application system',

  options: [

    // ── /application setup ──────────────────────────────────────────────────
    {
      name: 'setup',
      description: 'Initial setup — configure review and log channels',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'review_channel',
          description: 'Channel where submitted applications are posted for review',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText],
          required: true
        },
        {
          name: 'panel_channel',
          description: 'Channel where the application panel is posted',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText],
          required: true
        },
        {
          name: 'log_channel',
          description: 'Optional log channel for application events',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText],
          required: false
        },
        {
          name: 'support_role',
          description: 'Role that can accept or reject applications (alongside Admins)',
          type: ApplicationCommandOptionType.Role,
          required: false
        }
      ]
    },

    // ── /application design ─────────────────────────────────────────────────
    {
      name: 'design',
      description: 'Open the application panel editor',
      type: ApplicationCommandOptionType.Subcommand
    },

    // ── /application info ───────────────────────────────────────────────────
    {
      name: 'info',
      description: 'View current application system configuration',
      type: ApplicationCommandOptionType.Subcommand
    },

    // ── /application disable ────────────────────────────────────────────────
    {
      name: 'disable',
      description: 'Disable the application system',
      type: ApplicationCommandOptionType.Subcommand
    },

    // ── /application enable ─────────────────────────────────────────────────
    {
      name: 'enable',
      description: 'Re-enable the application system',
      type: ApplicationCommandOptionType.Subcommand
    },

    // ── /application setrole ────────────────────────────────────────────────
    {
      name: 'setrole',
      description: 'Update the support role without re-running full setup',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'role',
          description: 'The new support role (leave empty to remove)',
          type: ApplicationCommandOptionType.Role,
          required: false
        }
      ]
    },

    // ── /application submissions ────────────────────────────────────────────
    {
      name: 'submissions',
      description: 'View application submissions (mods only)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'filter',
          description: 'Filter by status (default: all pending)',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: 'Pending',  value: 'PENDING'  },
            { name: 'Accepted', value: 'ACCEPTED' },
            { name: 'Rejected', value: 'REJECTED' },
            { name: 'All',      value: 'ALL'      }
          ]
        },
        {
          name: 'member',
          description: 'Filter by a specific member',
          type: ApplicationCommandOptionType.User,
          required: false
        }
      ]
    }
  ],

  async execute(interaction) {

    // ── Permission gate ─────────────────────────────────────────────────────
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder().setColor('Red')
          .setDescription('❌ **Permission Denied**\n\nYou must have **Administrator** permission to manage applications.')
          .setFooter(FOOTER)]
      });
    }

    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    // ══════════════════════════════════════════════════════════════════════
    // SETUP
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'setup') {
      const reviewChannel = interaction.options.getChannel('review_channel');
      const panelChannel  = interaction.options.getChannel('panel_channel');
      const logChannel    = interaction.options.getChannel('log_channel');
      const supportRole   = interaction.options.getRole('support_role');

      // Bot permission check
      const botMember = interaction.guild.members.me;
      if (!botMember.permissions.has(PermissionFlagsBits.SendMessages)) {
        return interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setColor('Red')
            .setDescription('❌ **Bot Missing Permission**\n\nI need **Send Messages** permission to post application reviews.')
            .setFooter(FOOTER)]
        });
      }

      let config = await ApplicationConfig.findOne({ guildId: gid });

      if (config) {
        config.reviewChannelId = reviewChannel.id;
        config.panelChannelId  = panelChannel.id;
        if (logChannel)   config.logChannelId   = logChannel.id;
        if (supportRole)  config.supportRoleId  = supportRole.id;
        config.setupBy = interaction.user.id;
        await config.save();
      } else {
        config = await ApplicationConfig.create({
          guildId:         gid,
          reviewChannelId: reviewChannel.id,
          panelChannelId:  panelChannel.id,
          logChannelId:    logChannel?.id   || null,
          supportRoleId:   supportRole?.id  || null,
          setupBy:         interaction.user.id
        });
      }

      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('Green')
          .setTitle('✅ Application System Configured')
          .setDescription(
            `• **Review Channel:** ${reviewChannel}\n` +
            `• **Panel Channel:** ${panelChannel}\n` +
            `• **Log Channel:** ${logChannel || '*Not set*'}\n` +
            `• **Support Role:** ${supportRole || '*Not set*'}\n\n` +
            `Next step: Run \`/application design\` to create your application panel.`
          ).setFooter(FOOTER)]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // DESIGN
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'design') {
      // Check setup
      const config = await ApplicationConfig.findOne({ guildId: gid });
      if (!config || !config.reviewChannelId) {
        return interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setColor('Red')
            .setDescription('❌ **Not Configured**\n\nRun `/application setup` first.')
            .setFooter(FOOTER)]
        });
      }

      // Check for existing session
      const existingState = getAppState(gid);
      if (existingState) {
        return interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setColor('Orange')
            .setDescription('⚠️ **Editor Already Active**\n\nA design session is already in progress. Please finish or wait for it to expire (10 minutes).')
            .setFooter(FOOTER)]
        });
      }

      // Create editor state
      const state = createAppState(gid, interaction.user.id);

      // Pre-fill from existing config if available
      if (config.panelEmbed?.title)       state.embed.title       = config.panelEmbed.title;
      if (config.panelEmbed?.description) state.embed.description = config.panelEmbed.description;
      if (config.panelEmbed?.color)       state.embed.color       = config.panelEmbed.color;
      if (config.panelEmbed?.image)       state.embed.image       = config.panelEmbed.image;
      if (config.displayMode)             state.displayMode       = config.displayMode;
      if (config.applications?.length)    state.applications      = JSON.parse(JSON.stringify(config.applications));

      const embed = buildMainEditorEmbed(state);
      const comps = buildMainEditorComponents(state);

      const msg = await interaction.reply({
        embeds:     [embed],
        components: comps,
        fetchReply: true
      });

      state.messageId = msg.id;

      // Set expiry timer
      resetAppTimeout(state, async () => {
        deleteAppState(gid);
        interaction.user.send({
          embeds: [new EmbedBuilder().setColor('Orange')
            .setDescription('⏳ **Application Editor Expired**\n\nYour editor was discarded due to 10 minutes of inactivity.\n\nRun `/application design` to start again.')
            .setFooter(FOOTER)]
        }).catch(() => {});
      });

      return;
    }

    // ══════════════════════════════════════════════════════════════════════
    // INFO
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'info') {
      await interaction.deferReply({ ephemeral: true });
      const config = await ApplicationConfig.findOne({ guildId: gid });

      if (!config) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('Red')
            .setDescription('❌ Application system is not configured. Run `/application setup`.')
            .setFooter(FOOTER)]
        });
      }

      const appList = config.applications.length
        ? config.applications.map((a, i) =>
            `${i + 1}. **${a.label}** \`${a.id}\` — ${a.questions.length}q${a.roleId ? ` | <@&${a.roleId}>` : ''}`
          ).join('\n')
        : '*No applications configured.*';

      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor('Blue')
          .setTitle('📋 Application System Info')
          .addFields(
            { name: '📥 Review Channel', value: config.reviewChannelId ? `<#${config.reviewChannelId}>` : '*Not set*', inline: true },
            { name: '📢 Panel Channel',  value: config.panelChannelId  ? `<#${config.panelChannelId}>` : '*Not set*',  inline: true },
            { name: '📋 Log Channel',    value: config.logChannelId    ? `<#${config.logChannelId}>` : '*Not set*',    inline: true },
            { name: '🖥️ Display Mode',   value: config.displayMode,                                                    inline: true },
            { name: '🟢 Status',         value: config.isLive ? 'Live' : 'Not Published',                             inline: true },
            { name: `📝 Applications (${config.applications.length})`, value: appList, inline: false }
          )
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // DISABLE
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'disable') {
      const config = await ApplicationConfig.findOne({ guildId: gid });
      if (!config) {
        return interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Application system is not set up.').setFooter(FOOTER)]
        });
      }
      if (!config.isLive) {
        return interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setColor('Blue').setDescription('ℹ️ Application system is already disabled.').setFooter(FOOTER)]
        });
      }

      config.isLive = false;
      await config.save();

      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('Red')
          .setDescription('🚫 **Application System Disabled**\n\nUsers can no longer submit applications.')
          .setFooter(FOOTER)]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // ENABLE
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'enable') {
      const config = await ApplicationConfig.findOne({ guildId: gid });
      if (!config) {
        return interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Application system is not set up.').setFooter(FOOTER)]
        });
      }
      if (config.isLive) {
        return interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setColor('Blue').setDescription('ℹ️ Application system is already enabled.').setFooter(FOOTER)]
        });
      }
      if (!config.panelMessageId) {
        return interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setColor('Orange')
            .setDescription('⚠️ No panel has been published yet. Run `/application design` to create and publish a panel first.')
            .setFooter(FOOTER)]
        });
      }

      config.isLive = true;
      await config.save();

      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('Green')
          .setDescription('✅ **Application System Enabled**\n\nUsers can now submit applications.')
          .setFooter(FOOTER)]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // SETROLE — update support role without full re-setup
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'setrole') {
      const config = await ApplicationConfig.findOne({ guildId: gid });
      if (!config) {
        return interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Application system is not set up.').setFooter(FOOTER)]
        });
      }

      const role = interaction.options.getRole('role');
      config.supportRoleId = role?.id || null;
      await config.save();

      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('Green')
          .setDescription(role
            ? `✅ Support role updated to <@&${role.id}>.\nThis role can now accept/reject applications.`
            : `✅ Support role removed. Only Administrators can now review applications.`
          ).setFooter(FOOTER)]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // SUBMISSIONS — mods view submission list
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'submissions') {
      const config = await ApplicationConfig.findOne({ guildId: gid });
      if (!config) {
        return interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ Application system is not set up.').setFooter(FOOTER)]
        });
      }

      // Support role OR admin can view
      const canView =
        interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
        (config.supportRoleId && interaction.member.roles.cache.has(config.supportRoleId));

      if (!canView) {
        return interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setColor('Red')
            .setDescription('❌ Only Administrators and the Support Role can view submissions.')
            .setFooter(FOOTER)]
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const filter = interaction.options.getString('filter') || 'PENDING';
      const member = interaction.options.getUser('member');

      const query = { guildId: gid };
      if (filter !== 'ALL')  query.status = filter;
      if (member)            query.userId = member.id;

      const submissions = await ApplicationSubmission
        .find(query)
        .sort({ submittedAt: -1 })
        .limit(15);

      if (!submissions.length) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('Blue')
            .setDescription(`📭 No **${filter === 'ALL' ? '' : filter.toLowerCase() + ' '}**submissions found.`)
            .setFooter(FOOTER)]
        });
      }

      const statusEmoji = { PENDING: '⏳', ACCEPTED: '✅', REJECTED: '❌' };

      const lines = submissions.map(s =>
        `${statusEmoji[s.status]} \`${s.appId}\` — **${s.applicationLabel}** — <@${s.userId}> — <t:${Math.floor(new Date(s.submittedAt).getTime() / 1000)}:R>`
      );

      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setTitle('📋 Application Submissions')
        .setDescription(lines.join('\n'))
        .setFooter({ text: `Apex • Application System  |  Showing up to 15 results` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  }
};
