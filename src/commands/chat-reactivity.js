const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
} = require('discord.js');

const ChatReactivity = require('../models/ChatReactivity');

const FOOTER = { text: 'Apex • Chat Reactivity' };

function genId() {
  return `CR-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

function errReply(interaction, desc) {
  const method = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
  return interaction[method]({
    ephemeral: true,
    embeds: [new EmbedBuilder().setColor('Red').setDescription(desc).setFooter(FOOTER)]
  });
}

module.exports = {
  name: 'chat-reactivity',
  description: 'Ping roles/users when a channel goes inactive for a set amount of time',

  options: [

    // ── /chat-reactivity setup ──────────────────────────────────────────────
    {
      name: 'setup',
      description: 'Create or update an inactivity monitor for a channel',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'channel',
          description: 'Channel to monitor for inactivity',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText],
          required: true
        },
        {
          name: 'role',
          description: 'Role to ping when inactive (use /chat-reactivity addping to add more)',
          type: ApplicationCommandOptionType.Role,
          required: true
        },
        {
          name: 'inactivity_minutes',
          description: 'Minutes of silence before pinging',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          minValue: 5,
          maxValue: 10080
        },
        {
          name: 'ping_mode',
          description: 'Repeat = keep nagging until reply | Once = ping a single time',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: '🔁 Repeat (until someone replies)', value: 'repeat' },
            { name: '1️⃣ Once (single ping only)',         value: 'once'   }
          ]
        },
        {
          name: 'cooldown_minutes',
          description: 'Minutes between repeat pings (default: 60, ignored in Once mode)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 5,
          maxValue: 10080
        },
        {
          name: 'min_message_threshold',
          description: 'Messages needed in a burst to count as real activity (default: 1)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 1,
          maxValue: 20
        },
        {
          name: 'message',
          description: 'Custom ping message — use {role} and {channel} placeholders',
          type: ApplicationCommandOptionType.String,
          required: false
        }
      ]
    },

    // ── /chat-reactivity businesshours ──────────────────────────────────────
    {
      name: 'businesshours',
      description: 'Restrict pings to specific hours/days for a monitor',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'monitor_id',
          description: 'The monitor ID',
          type: ApplicationCommandOptionType.String,
          required: true
        },
        {
          name: 'enabled',
          description: 'Turn business hours restriction on/off',
          type: ApplicationCommandOptionType.Boolean,
          required: true
        },
        {
          name: 'start_hour',
          description: 'Start hour 0-23 (local time per utc_offset)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 0,
          maxValue: 23
        },
        {
          name: 'end_hour',
          description: 'End hour 0-23 (local time per utc_offset)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 0,
          maxValue: 23
        },
        {
          name: 'utc_offset',
          description: 'UTC offset for your timezone (e.g. -5 for EST, 1 for CET)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: -12,
          maxValue: 14
        },
        {
          name: 'skip_weekends',
          description: 'Never ping on Saturday/Sunday',
          type: ApplicationCommandOptionType.Boolean,
          required: false
        }
      ]
    },

    // ── /chat-reactivity addping ────────────────────────────────────────────
    {
      name: 'addping',
      description: 'Add an additional role or user to ping for a monitor',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'monitor_id',
          description: 'The monitor ID',
          type: ApplicationCommandOptionType.String,
          required: true
        },
        {
          name: 'role',
          description: 'Additional role to ping',
          type: ApplicationCommandOptionType.Role,
          required: false
        },
        {
          name: 'user',
          description: 'Additional specific user to ping',
          type: ApplicationCommandOptionType.User,
          required: false
        }
      ]
    },

    // ── /chat-reactivity snooze ──────────────────────────────────────────────
    {
      name: 'snooze',
      description: 'Temporarily pause a monitor without disabling it',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'monitor_id',
          description: 'The monitor ID to snooze',
          type: ApplicationCommandOptionType.String,
          required: true
        },
        {
          name: 'hours',
          description: 'How many hours to snooze for',
          type: ApplicationCommandOptionType.Integer,
          required: true,
          minValue: 1,
          maxValue: 720
        }
      ]
    },

    // ── /chat-reactivity list ───────────────────────────────────────────────
    {
      name: 'list',
      description: 'List all inactivity monitors in this server',
      type: ApplicationCommandOptionType.Subcommand
    },

    // ── /chat-reactivity history ─────────────────────────────────────────────
    {
      name: 'history',
      description: 'View the last 30 pings sent by this system',
      type: ApplicationCommandOptionType.Subcommand
    },

    // ── /chat-reactivity toggle ──────────────────────────────────────────────
    {
      name: 'toggle',
      description: 'Enable or disable a monitor',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: 'monitor_id', description: 'The monitor ID to toggle', type: ApplicationCommandOptionType.String, required: true }
      ]
    },

    // ── /chat-reactivity remove ─────────────────────────────────────────────
    {
      name: 'remove',
      description: 'Remove a monitor',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        { name: 'monitor_id', description: 'The monitor ID to remove', type: ApplicationCommandOptionType.String, required: true }
      ]
    }
  ],

  async execute(interaction) {

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        ephemeral: true,
        embeds: [new EmbedBuilder().setColor('Red')
          .setTitle('❌ Permission Denied')
          .setDescription('You need **Manage Server** permission to use this command.')
          .setFooter(FOOTER)]
      });
    }

    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    // ══════════════════════════════════════════════════════════════════════════
    // SETUP
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'setup') {
      const channel        = interaction.options.getChannel('channel');
      const role            = interaction.options.getRole('role');
      const inactivityMin   = interaction.options.getInteger('inactivity_minutes');
      const pingMode         = interaction.options.getString('ping_mode') || 'repeat';
      const cooldownMin      = interaction.options.getInteger('cooldown_minutes') ?? 60;
      const minThreshold     = interaction.options.getInteger('min_message_threshold') ?? 1;
      const customMessage    = interaction.options.getString('message');

      const botPerms = channel.permissionsFor(interaction.guild.members.me);
      if (!botPerms || !botPerms.has(PermissionFlagsBits.SendMessages) || !botPerms.has(PermissionFlagsBits.ViewChannel)) {
        return errReply(interaction, `❌ I need **View Channel** and **Send Messages** permission in ${channel}.`);
      }

      let doc = await ChatReactivity.findOne({ guildId: gid });
      if (!doc) doc = await ChatReactivity.create({ guildId: gid });

      const existingIdx = doc.monitors.findIndex(m => m.channelId === channel.id);

      if (doc.monitors.length >= 20 && existingIdx === -1) {
        return errReply(interaction, '❌ Maximum of **20 monitors** per server reached.');
      }

      const monitorId = existingIdx !== -1 ? doc.monitors[existingIdx].id : genId();
      const existing  = existingIdx !== -1 ? doc.monitors[existingIdx] : null;

      const monitorData = {
        id:                  monitorId,
        channelId:           channel.id,
        pingRoleIds:         [role.id],
        pingUserIds:         existing?.pingUserIds || [],
        inactivityMinutes:   inactivityMin,
        pingMode,
        pingCooldownMinutes: cooldownMin,
        minMessageThreshold: minThreshold,
        customMessage:       customMessage || null,
        enabled:             true,
        lastMessageAt:       new Date(),
        lastPingedAt:        null,
        recentMessageCount:  0,
        pingFiredSinceActivity: false,
        businessHoursEnabled: existing?.businessHoursEnabled || false,
        businessHoursStart:   existing?.businessHoursStart ?? 9,
        businessHoursEnd:     existing?.businessHoursEnd ?? 17,
        utcOffsetHours:       existing?.utcOffsetHours ?? 0,
        skipWeekends:         existing?.skipWeekends || false,
        snoozedUntil:         null
      };

      if (existingIdx !== -1) {
        doc.monitors[existingIdx] = monitorData;
      } else {
        doc.monitors.push(monitorData);
      }

      await doc.save();

      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('Green')
          .setTitle(existingIdx !== -1 ? '✅ Monitor Updated' : '✅ Monitor Created')
          .addFields(
            { name: '🆔 Monitor ID',  value: `\`${monitorId}\``,                          inline: true },
            { name: '📢 Channel',     value: `${channel}`,                                inline: true },
            { name: '🎭 Ping Role',   value: `<@&${role.id}>`,                            inline: true },
            { name: '⏱️ Inactivity',   value: `${inactivityMin} min`,                      inline: true },
            { name: '🔁 Mode',        value: pingMode === 'once' ? '1️⃣ Once' : '🔁 Repeat', inline: true },
            { name: '⏳ Cooldown',     value: pingMode === 'once' ? 'N/A' : `${cooldownMin} min`, inline: true },
            { name: '📊 Min Threshold', value: `${minThreshold} msg(s)`,                  inline: true },
            { name: '💬 Message',     value: customMessage || '*Default*',                inline: false }
          )
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // BUSINESS HOURS
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'businesshours') {
      const monitorId    = interaction.options.getString('monitor_id').trim().toUpperCase();
      const enabled        = interaction.options.getBoolean('enabled');
      const startHour      = interaction.options.getInteger('start_hour');
      const endHour         = interaction.options.getInteger('end_hour');
      const utcOffset       = interaction.options.getInteger('utc_offset');
      const skipWeekends    = interaction.options.getBoolean('skip_weekends');

      await interaction.deferReply({ ephemeral: true });

      const doc = await ChatReactivity.findOne({ guildId: gid });
      if (!doc) return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ No monitors configured.').setFooter(FOOTER)] });

      const monitor = doc.monitors.find(m => m.id === monitorId);
      if (!monitor) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription(`❌ No monitor found with ID \`${monitorId}\`.`).setFooter(FOOTER)] });
      }

      monitor.businessHoursEnabled = enabled;
      if (startHour    !== null) monitor.businessHoursStart = startHour;
      if (endHour       !== null) monitor.businessHoursEnd   = endHour;
      if (utcOffset     !== null) monitor.utcOffsetHours     = utcOffset;
      if (skipWeekends  !== null) monitor.skipWeekends        = skipWeekends;

      await doc.save();

      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor('Green')
          .setTitle('✅ Business Hours Updated')
          .addFields(
            { name: '🆔 Monitor',   value: `\`${monitor.id}\``,                                            inline: true },
            { name: '📊 Status',    value: monitor.businessHoursEnabled ? '🟢 Enabled' : '🔴 Disabled',     inline: true },
            { name: '🕐 Hours',     value: `${monitor.businessHoursStart}:00 → ${monitor.businessHoursEnd}:00`, inline: true },
            { name: '🌍 UTC Offset',value: `${monitor.utcOffsetHours >= 0 ? '+' : ''}${monitor.utcOffsetHours}`, inline: true },
            { name: '📅 Weekends',  value: monitor.skipWeekends ? '🚫 Skipped' : '✅ Included',              inline: true }
          )
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ADD PING (additional role/user)
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'addping') {
      const monitorId = interaction.options.getString('monitor_id').trim().toUpperCase();
      const role        = interaction.options.getRole('role');
      const user         = interaction.options.getUser('user');

      if (!role && !user) {
        return errReply(interaction, '❌ Provide a `role` or `user` to add.');
      }

      await interaction.deferReply({ ephemeral: true });

      const doc = await ChatReactivity.findOne({ guildId: gid });
      if (!doc) return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ No monitors configured.').setFooter(FOOTER)] });

      const monitor = doc.monitors.find(m => m.id === monitorId);
      if (!monitor) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription(`❌ No monitor found with ID \`${monitorId}\`.`).setFooter(FOOTER)] });
      }

      const added = [];

      if (role && !monitor.pingRoleIds.includes(role.id)) {
        monitor.pingRoleIds.push(role.id);
        added.push(`<@&${role.id}>`);
      }
      if (user && !monitor.pingUserIds.includes(user.id)) {
        monitor.pingUserIds.push(user.id);
        added.push(`<@${user.id}>`);
      }

      if (added.length === 0) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Orange').setDescription('⚠️ Already configured to ping that role/user.').setFooter(FOOTER)] });
      }

      await doc.save();

      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor('Green')
          .setTitle('✅ Ping Targets Added')
          .setDescription(`Added: ${added.join(', ')}\n\n**Total roles:** ${monitor.pingRoleIds.length} | **Total users:** ${monitor.pingUserIds.length}`)
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SNOOZE
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'snooze') {
      const monitorId = interaction.options.getString('monitor_id').trim().toUpperCase();
      const hours       = interaction.options.getInteger('hours');

      await interaction.deferReply({ ephemeral: true });

      const doc = await ChatReactivity.findOne({ guildId: gid });
      if (!doc) return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ No monitors configured.').setFooter(FOOTER)] });

      const monitor = doc.monitors.find(m => m.id === monitorId);
      if (!monitor) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription(`❌ No monitor found with ID \`${monitorId}\`.`).setFooter(FOOTER)] });
      }

      const snoozeUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
      monitor.snoozedUntil = snoozeUntil;
      await doc.save();

      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor('Blue')
          .setTitle('😴 Monitor Snoozed')
          .setDescription(`\`${monitor.id}\` will not ping until <t:${Math.floor(snoozeUntil.getTime() / 1000)}:F> (<t:${Math.floor(snoozeUntil.getTime() / 1000)}:R>).`)
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // LIST
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'list') {
      await interaction.deferReply({ ephemeral: true });

      const doc = await ChatReactivity.findOne({ guildId: gid });

      if (!doc || doc.monitors.length === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('Blue')
            .setTitle('📋 Chat Reactivity Monitors')
            .setDescription('No monitors configured yet.\nUse `/chat-reactivity setup` to create one.')
            .setFooter(FOOTER)]
        });
      }

      const lines = doc.monitors.map(m => {
        let status = m.enabled ? '🟢' : '🔴';
        if (m.snoozedUntil && new Date(m.snoozedUntil).getTime() > Date.now()) status = '😴';

        const lastMsgUnix = Math.floor(new Date(m.lastMessageAt).getTime() / 1000);
        const pings = [...m.pingRoleIds.map(id => `<@&${id}>`), ...m.pingUserIds.map(id => `<@${id}>`)].join(' ');

        let extra = [];
        if (m.businessHoursEnabled) extra.push(`🕐 ${m.businessHoursStart}-${m.businessHoursEnd}h`);
        if (m.skipWeekends)         extra.push('📅 No weekends');
        if (m.pingMode === 'once')  extra.push('1️⃣ Once');
        if (m.minMessageThreshold > 1) extra.push(`📊 ${m.minMessageThreshold}+ msgs`);

        return (
          `${status} \`${m.id}\` — <#${m.channelId}>\n` +
          `> Ping: ${pings || '*none configured*'}\n` +
          `> Threshold: **${m.inactivityMinutes}min** silence` + (extra.length ? ` | ${extra.join(' | ')}` : '') + `\n` +
          `> Last activity: <t:${lastMsgUnix}:R>`
        );
      });

      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor('Blue')
          .setTitle(`📋 Chat Reactivity Monitors (${doc.monitors.length})`)
          .setDescription(lines.join('\n\n'))
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // HISTORY
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'history') {
      await interaction.deferReply({ ephemeral: true });

      const doc = await ChatReactivity.findOne({ guildId: gid });

      if (!doc || doc.pingLog.length === 0) {
        return interaction.editReply({
          embeds: [new EmbedBuilder().setColor('Blue')
            .setTitle('📜 Ping History')
            .setDescription('No pings have been sent yet.')
            .setFooter(FOOTER)]
        });
      }

      const logs = [...doc.pingLog].reverse();

      const lines = logs.map((log, i) =>
        `**${i + 1}.** \`${log.monitorId}\` → <#${log.channelId}>\n` +
        `> <t:${Math.floor(new Date(log.pingedAt).getTime() / 1000)}:R> — silent for **${log.silentForMinutes}min**`
      );

      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor('Blue')
          .setTitle(`📜 Ping History (${logs.length})`)
          .setDescription(lines.join('\n\n'))
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TOGGLE
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'toggle') {
      const monitorId = interaction.options.getString('monitor_id').trim().toUpperCase();

      await interaction.deferReply({ ephemeral: true });

      const doc = await ChatReactivity.findOne({ guildId: gid });
      if (!doc) return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ No monitors configured.').setFooter(FOOTER)] });

      const monitor = doc.monitors.find(m => m.id === monitorId);
      if (!monitor) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription(`❌ No monitor found with ID \`${monitorId}\`.`).setFooter(FOOTER)] });
      }

      monitor.enabled = !monitor.enabled;
      if (monitor.enabled) {
        monitor.lastMessageAt = new Date();
        monitor.pingFiredSinceActivity = false;
      }
      await doc.save();

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(monitor.enabled ? 'Green' : 'Orange')
          .setTitle(monitor.enabled ? '🟢 Monitor Enabled' : '🔴 Monitor Disabled')
          .addFields(
            { name: '🆔 ID',      value: `\`${monitor.id}\``,       inline: true },
            { name: '📢 Channel', value: `<#${monitor.channelId}>`, inline: true },
            { name: '📊 Status',  value: monitor.enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true }
          )
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // REMOVE
    // ══════════════════════════════════════════════════════════════════════════
    if (sub === 'remove') {
      const monitorId = interaction.options.getString('monitor_id').trim().toUpperCase();

      await interaction.deferReply({ ephemeral: true });

      const doc = await ChatReactivity.findOne({ guildId: gid });
      if (!doc) return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription('❌ No monitors configured.').setFooter(FOOTER)] });

      const idx = doc.monitors.findIndex(m => m.id === monitorId);
      if (idx === -1) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setColor('Red').setDescription(`❌ No monitor found with ID \`${monitorId}\`.`).setFooter(FOOTER)] });
      }

      const removed = doc.monitors[idx];
      doc.monitors.splice(idx, 1);
      await doc.save();

      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor('Orange')
          .setTitle('🗑️ Monitor Removed')
          .addFields(
            { name: '🆔 ID',      value: `\`${removed.id}\``,       inline: true },
            { name: '📢 Channel', value: `<#${removed.channelId}>`, inline: true }
          )
          .setFooter(FOOTER)
          .setTimestamp()]
      });
    }
  }
};
