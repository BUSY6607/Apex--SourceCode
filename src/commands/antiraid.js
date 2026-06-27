const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
} = require('discord.js');

const AntiRaidConfig = require('../models/AntiRaidConfig');
const { lockdownGuild, liftLockdown } = require('../utils/antiRaidEngine');

const FOOTER = { text: 'Apex • Anti-Raid' };

function errReply(interaction, desc) {
  const method = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
  return interaction[method]({
    ephemeral: true,
    embeds: [new EmbedBuilder().setColor('Red').setDescription(desc).setFooter(FOOTER)]
  });
}

module.exports = {
  name: 'antiraid',
  description: 'Configure and manage the Anti-Raid protection system',

  options: [

    // ── /antiraid setup ─────────────────────────────────────────────────────
    {
      name: 'setup',
      description: 'Configure anti-raid detection and response',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'enabled',
          description: 'Turn anti-raid protection on or off',
          type: ApplicationCommandOptionType.Boolean,
          required: true
        },
        {
          name: 'alert_channel',
          description: 'Channel where raid alerts are posted',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText],
          required: false
        },
        {
          name: 'alert_role',
          description: 'Role to ping when a raid is detected',
          type: ApplicationCommandOptionType.Role,
          required: false
        },
        {
          name: 'response_action',
          description: 'What to do to the detected raider',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '🛡️ Strip Roles (safest, reversible)', value: 'strip_roles'   },
            { name: '👢 Kick',                              value: 'kick'         },
            { name: '🔨 Ban',                               value: 'ban'          },
            { name: '🔒 Lockdown Only (no action on actor)', value: 'lockdown_only' }
          ]
        },
        {
          name: 'lockdown_on_detect',
          description: 'Lock the server (disable @everyone send/connect) when a raid is detected',
          type: ApplicationCommandOptionType.Boolean,
          required: false
        },
        {
          name: 'lockdown_duration_minutes',
          description: 'Auto-lift lockdown after this many minutes (0 = manual lift only)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 0,
          maxValue: 1440
        }
      ]
    },

    // ── /antiraid threshold ─────────────────────────────────────────────────
    {
      name: 'threshold',
      description: 'Set the burst detection threshold for a specific action type',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'action_type',
          description: 'Which action to configure',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: 'Channel Deletion', value: 'channelDelete' },
            { name: 'Channel Creation', value: 'channelCreate' },
            { name: 'Role Deletion',    value: 'roleDelete'    },
            { name: 'Role Creation',    value: 'roleCreate'    },
            { name: 'Mass Ban',         value: 'banAdd'        },
            { name: 'Mass Kick',        value: 'kickAdd'       }
          ]
        },
        {
          name: 'count',
          description: 'Number of actions that triggers detection',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          minValue: 2,
          maxValue: 100
        },
        {
          name: 'window_seconds',
          description: 'Time window in seconds',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          minValue: 5,
          maxValue: 300
        }
      ]
    },

    // ── /antiraid exempt ────────────────────────────────────────────────────
    {
      name: 'exempt',
      description: 'Add or remove a user/role from the exempt list',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'action',
          description: 'Add or remove',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: 'Add',    value: 'add'    },
            { name: 'Remove', value: 'remove' }
          ]
        },
        {
          name: 'user',
          description: 'User to exempt',
          type: ApplicationCommandOptionType.User,
          required: false
        },
        {
          name: 'role',
          description: 'Role to exempt (anyone with this role is never flagged)',
          type: ApplicationCommandOptionType.Role,
          required: false
        }
      ]
    },

    // ── /antiraid lockdown ──────────────────────────────────────────────────
    {
      name: 'lockdown',
      description: 'Manually lock the server down right now',
      type: ApplicationCommandOptionType.Subcommand
    },

    // ── /antiraid unlock ─────────────────────────────────────────────────────
    {
      name: 'unlock',
      description: 'Manually lift an active lockdown',
      type: ApplicationCommandOptionType.Subcommand
    },

    // ── /antiraid status ─────────────────────────────────────────────────────
    {
      name: 'status',
      description: 'View current anti-raid configuration and lockdown status',
      type: ApplicationCommandOptionType.Subcommand
    },

    // ── /antiraid history ────────────────────────────────────────────────────
    {
      name: 'history',
      description: 'View the last 30 detected incidents',
      type: ApplicationCommandOptionType.Subcommand
    }
  ],

  async execute(interaction) {

    // ── Permission gate — Administrator only, this is a serious security tool ─
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder().setColor('Red')
          .setTitle('❌ Permission Denied')
          .setDescription('You need **Administrator** permission to manage Anti-Raid settings.')
          .setFooter(FOOTER)]
      });
    }

    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    let config = await AntiRaidConfig.findOne({ guildId: gid });
    if (!config) config = await AntiRaidConfig.create({ guildId: gid });

    // ══════════════════════════════════════════════════════════════════════════
    // SETUP
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'setup') {
      const enabled         = interaction.options.getBoolean('enabled');
      const alertChannel     = interaction.options.getChannel('alert_channel');
      const alertRole         = interaction.options.getRole('alert_role');
      const responseAction     = interaction.options.getString('response_action');
      const lockdownOnDetect   = interaction.options.getBoolean('lockdown_on_detect');
      const lockdownDuration   = interaction.options.getInteger('lockdown_duration_minutes');

      // Bot permission check — needs Manage Roles + audit log view + ban/kick depending on response
      const botPerms = interaction.guild.members.me.permissions;
      if (!botPerms.has(PermissionFlagsBits.ViewAuditLog)) {
        return errReply(interaction, '❌ I need **View Audit Log** permission to identify raiders.');
      }
      if (!botPerms.has(PermissionFlagsBits.ManageRoles)) {
        return errReply(interaction, '❌ I need **Manage Roles** permission for lockdown and role-strip responses.');
      }

      config.enabled = enabled;
      if (alertChannel    !== null) config.alertChannelId = alertChannel.id;
      if (alertRole         !== null) config.alertRoleId    = alertRole.id;
      if (responseAction)             config.responseAction = responseAction;
      if (lockdownOnDetect !== null) config.lockdownOnDetect = lockdownOnDetect;
      if (lockdownDuration !== null) config.lockdownDurationMinutes = lockdownDuration;

      await config.save();

      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(enabled ? 'Green' : 'Orange')
          .setTitle(enabled ? '✅ Anti-Raid Enabled' : '🔴 Anti-Raid Disabled')
          .addFields(
            { name: '📢 Alert Channel',  value: config.alertChannelId ? `<#${config.alertChannelId}>` : '*Not set*', inline: true },
            { name: '🎭 Alert Role',     value: config.alertRoleId    ? `<@&${config.alertRoleId}>`   : '*Not set*', inline: true },
            { name: '🛡️ Response',       value: config.responseAction,                                              inline: true },
            { name: '🔒 Auto-Lockdown',  value: config.lockdownOnDetect ? 'Enabled' : 'Disabled',                    inline: true },
            { name: '⏱️ Lockdown Duration', value: config.lockdownDurationMinutes > 0 ? `${config.lockdownDurationMinutes} min` : 'Manual lift only', inline: true }
          )
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // THRESHOLD
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'threshold') {
      const actionType    = interaction.options.getString('action_type');
      const count          = interaction.options.getInteger('count');
      const windowSeconds   = interaction.options.getInteger('window_seconds');

      config.thresholds[actionType] = { count, windowSeconds };
      await config.save();

      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('Green')
          .setTitle('✅ Threshold Updated')
          .setDescription(`**${actionType}** now triggers detection at **${count} actions within ${windowSeconds}s**.`)
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // EXEMPT
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'exempt') {
      const action = interaction.options.getString('action');
      const user     = interaction.options.getUser('user');
      const role      = interaction.options.getRole('role');

      if (!user && !role) {
        return errReply(interaction, '❌ Provide a `user` or `role` to exempt.');
      }

      const changes = [];

      if (action === 'add') {
        if (user && !config.exemptUserIds.includes(user.id)) { config.exemptUserIds.push(user.id); changes.push(`${user}`); }
        if (role && !config.exemptRoleIds.includes(role.id)) { config.exemptRoleIds.push(role.id); changes.push(`<@&${role.id}>`); }
      } else {
        if (user) { const i = config.exemptUserIds.indexOf(user.id); if (i !== -1) { config.exemptUserIds.splice(i, 1); changes.push(`${user}`); } }
        if (role)  { const i = config.exemptRoleIds.indexOf(role.id); if (i !== -1) { config.exemptRoleIds.splice(i, 1); changes.push(`<@&${role.id}>`); } }
      }

      await config.save();

      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(action === 'add' ? 'Green' : 'Orange')
          .setTitle(action === 'add' ? '✅ Exemption Added' : '🗑️ Exemption Removed')
          .setDescription(changes.length ? changes.join(', ') : 'No changes made.')
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // LOCKDOWN (manual)
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'lockdown') {
      if (config.isLockedDown) {
        return errReply(interaction, '⚠️ The server is already locked down.');
      }

      await interaction.deferReply();
      await lockdownGuild(interaction.guild, config);
      await config.save();

      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor('Red')
          .setTitle('🔒 Server Locked Down')
          .setDescription('@everyone can no longer send messages or connect to voice.\nUse `/antiraid unlock` to restore normal access.')
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // UNLOCK (manual)
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'unlock') {
      if (!config.isLockedDown) {
        return errReply(interaction, 'ℹ️ The server is not currently locked down.');
      }

      await interaction.deferReply();
      await liftLockdown(interaction.guild, config);
      await config.save();

      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor('Green')
          .setTitle('🔓 Lockdown Lifted')
          .setDescription('@everyone permissions have been restored to their pre-lockdown state.')
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STATUS
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'status') {
      await interaction.deferReply({ ephemeral: true });

      const t = config.thresholds;

      const embed = new EmbedBuilder()
        .setColor(config.enabled ? 'Green' : 'Red')
        .setTitle('🛡️ Anti-Raid Status')
        .addFields(
          { name: '📊 System',         value: config.enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
          { name: '🔒 Lockdown',       value: config.isLockedDown ? '🔴 ACTIVE' : '🟢 Normal', inline: true },
          { name: '🛡️ Response',       value: config.responseAction, inline: true },
          { name: '📢 Alert Channel',  value: config.alertChannelId ? `<#${config.alertChannelId}>` : '*Not set*', inline: true },
          { name: '🎭 Alert Role',     value: config.alertRoleId ? `<@&${config.alertRoleId}>` : '*Not set*', inline: true },
          { name: '🚫 Exemptions',     value: `${config.exemptUserIds.length} users, ${config.exemptRoleIds.length} roles`, inline: true },
          { name: '📋 Thresholds', value:
            `Channel Delete: ${t.channelDelete.count}/${t.channelDelete.windowSeconds}s\n` +
            `Channel Create: ${t.channelCreate.count}/${t.channelCreate.windowSeconds}s\n` +
            `Role Delete: ${t.roleDelete.count}/${t.roleDelete.windowSeconds}s\n` +
            `Role Create: ${t.roleCreate.count}/${t.roleCreate.windowSeconds}s\n` +
            `Mass Ban: ${t.banAdd.count}/${t.banAdd.windowSeconds}s\n` +
            `Mass Kick: ${t.kickAdd.count}/${t.kickAdd.windowSeconds}s`,
            inline: false
          }
        )
        .setFooter(FOOTER)
        .setTimestamp();

      if (config.isLockedDown && config.lockdownExpiresAt) {
        embed.addFields({ name: '⏱️ Auto-Lift', value: `<t:${Math.floor(new Date(config.lockdownExpiresAt).getTime() / 1000)}:R>`, inline: false });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HISTORY
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'history') {
      await interaction.deferReply({ ephemeral: true });

      if (!config.incidents.length) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('Blue')
            .setTitle('📜 Incident History')
            .setDescription('No raid incidents detected yet. ✅')
            .setFooter(FOOTER)]
        });
      }

      const logs = [...config.incidents].reverse();

      const lines = logs.map((inc, i) =>
        `**${i + 1}.** \`${inc.id}\` — ${inc.actionType}\n` +
        `> <@${inc.actorId}> — ${inc.count} actions in ${inc.windowSeconds}s\n` +
        `> Response: **${inc.responseTaken}** — <t:${Math.floor(new Date(inc.detectedAt).getTime() / 1000)}:R>`
      );

      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor('Orange')
          .setTitle(`📜 Incident History (${logs.length})`)
          .setDescription(lines.join('\n\n').slice(0, 4000))
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }
  }
};
