const {
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType
} = require('discord.js');

const FOOTER = { text: 'Apex • Help System' };
const COLOR  = 0x5865F2;

// ── Full command catalogue ─────────────────────────────────────────────────────
const CATEGORIES = {
  moderation: {
    label:       '🔨 Moderation',
    description: 'Commands for keeping your server safe and organized.',
    commands: [
      {
        name: '/ban',
        usage: '/ban <user> <reason>',
        description: 'Permanently ban a member from the server.',
        perms: 'Ban Members'
      },
      {
        name: '/unban',
        usage: '/unban <user_id> [reason]',
        description: 'Unban a previously banned user using their ID.',
        perms: 'Ban Members'
      },
      {
        name: '/kick',
        usage: '/kick <user> <reason>',
        description: 'Kick a member from the server.',
        perms: 'Kick Members'
      },
      {
        name: '/mute',
        usage: '/mute <user> <duration> <reason>',
        description: 'Timeout a member. Duration format: `10m`, `1h`, `1d`.',
        perms: 'Moderate Members'
      },
      {
        name: '/unmute',
        usage: '/unmute <user> [reason]',
        description: 'Remove a timeout from a member.',
        perms: 'Moderate Members'
      },
      {
        name: '/warn',
        usage: '/warn <member> <reason>',
        description: 'Issue a warning to a member. Saves to database and DMs the user.',
        perms: 'Moderate Members'
      },
      {
        name: '/warnings',
        usage: '/warnings <view|remove|clear>',
        description: 'Manage warnings.\n`view <member>` — see all warns\n`remove <warn_id>` — delete one warn\n`clear <member>` — wipe all warns',
        perms: 'Moderate Members'
      },
      {
        name: '/purge',
        usage: '/purge <amount> [user] [bots] [embeds]',
        description: 'Bulk delete up to 100 messages. Filter by user, bots only, or embeds only.',
        perms: 'Manage Messages'
      },
      {
        name: '/nuke',
        usage: '/nuke [channel]',
        description: 'Instantly wipe a channel by cloning it. Defaults to current channel.',
        perms: 'Administrator'
      },
      {
        name: '/lockchannel',
        usage: '/lockchannel [channel]',
        description: 'Lock a channel so members cannot send messages.',
        perms: 'Manage Channels'
      },
      {
        name: '/unlockchannel',
        usage: '/unlockchannel [channel]',
        description: 'Unlock a previously locked channel.',
        perms: 'Manage Channels'
      },
      {
        name: '/channelhide',
        usage: '/channelhide <hide|unhide> [channel]',
        description: 'Hide or unhide a channel from regular members.',
        perms: 'Manage Channels'
      }
    ]
  },

  roles: {
    label:       '🎭 Role Management',
    description: 'Commands for managing member roles.',
    commands: [
      {
        name: '/roleadd',
        usage: '/roleadd <member> <role> [reason]',
        description: 'Add a role to a member.',
        perms: 'Manage Roles'
      },
      {
        name: '/roleremove',
        usage: '/roleremove <member> <role> [reason]',
        description: 'Remove a role from a member.',
        perms: 'Manage Roles'
      }
    ]
  },

  logging: {
    label:       '📋 Log System',
    description: 'Configure where server events get logged.',
    commands: [
      {
        name: '/logs enable',
        usage: '/logs enable',
        description: 'Enable the log system globally for this server.',
        perms: 'Administrator'
      },
      {
        name: '/logs disable',
        usage: '/logs disable',
        description: 'Disable the log system globally.',
        perms: 'Administrator'
      },
      {
        name: '/logs set',
        usage: '/logs set <category> <channel>',
        description: 'Set a log channel for a category.\nCategories: `moderation` `messages` `roles` `channels` `members` `voice`',
        perms: 'Administrator'
      },
      {
        name: '/logs off',
        usage: '/logs off <category>',
        description: 'Disable logging for a specific category.',
        perms: 'Administrator'
      },
      {
        name: '/logs status',
        usage: '/logs status',
        description: 'View the current log configuration for all categories.',
        perms: 'Administrator'
      }
    ]
  },

  tickets: {
    label:       '🎫 Ticket System',
    description: 'Set up and manage the support ticket system.',
    commands: [
      {
        name: '/tickets setup',
        usage: '/tickets setup <panel_channel> <log_channel> <support_role> <parent_category>',
        description: 'Set up the ticket system. Creates a panel with a button users click to open tickets.',
        perms: 'Administrator'
      },
      {
        name: '/tickets design',
        usage: '/tickets design',
        description: 'Customize the ticket panel message, embed color, and button text.',
        perms: 'Administrator'
      }
    ]
  },

  reports: {
    label:       '🚨 Report System',
    description: 'Configure the server report system.',
    commands: [
      {
        name: '/reports enable',
        usage: '/reports enable <report_channel> <review_channel> <log_channel> <report_role>',
        description: 'Enable the report system with dedicated submission, review, and log channels.',
        perms: 'Administrator'
      },
      {
        name: '/reports disable',
        usage: '/reports disable',
        description: 'Disable the report system.',
        perms: 'Administrator'
      },
      {
        name: '/reports status',
        usage: '/reports status',
        description: 'View the current report system configuration.',
        perms: 'Administrator'
      },
      {
        name: '/reports restorecomponents',
        usage: '/reports restorecomponents',
        description: 'Restore the report action buttons if they go missing.',
        perms: 'Administrator'
      }
    ]
  },

  interaction: {
    label:       '🎨 Interaction Studio',
    description: 'Create and manage custom embed panels and buttons.',
    commands: [
      {
        name: '/interaction studio',
        usage: '/interaction studio',
        description: 'Open the Interaction Studio editor. Build custom embeds with buttons, colors, and messages — no coding needed.',
        perms: 'Administrator'
      }
    ]
  },

  antiraid: {
    label:       '🛡️ Anti-Raid',
    description: 'Automatic detection and response to mass-damage attacks (raids).',
    commands: [
      {
        name: '/antiraid setup',
        usage: '/antiraid setup <enabled> [alert_channel] [alert_role] [response_action] [lockdown_on_detect] [lockdown_duration_minutes]',
        description: 'Enable/disable anti-raid protection and configure the alert channel, response action, and lockdown behavior.',
        perms: 'Administrator'
      },
      {
        name: '/antiraid threshold',
        usage: '/antiraid threshold <action_type> <count> <window_seconds>',
        description: 'Set how many actions within how many seconds counts as a raid for a specific action type (channel/role create/delete, mass ban/kick).',
        perms: 'Administrator'
      },
      {
        name: '/antiraid exempt',
        usage: '/antiraid exempt <add|remove> [user] [role]',
        description: 'Exempt a trusted user or role from ever being flagged by anti-raid detection.',
        perms: 'Administrator'
      },
      {
        name: '/antiraid lockdown',
        usage: '/antiraid lockdown',
        description: 'Manually lock the server — disables @everyone send messages and voice connect.',
        perms: 'Administrator'
      },
      {
        name: '/antiraid unlock',
        usage: '/antiraid unlock',
        description: 'Manually lift an active lockdown and restore normal permissions.',
        perms: 'Administrator'
      },
      {
        name: '/antiraid status',
        usage: '/antiraid status',
        description: 'View current configuration, lockdown state, and all action thresholds.',
        perms: 'Administrator'
      },
      {
        name: '/antiraid history',
        usage: '/antiraid history',
        description: 'View the last 30 detected raid incidents and what action was taken.',
        perms: 'Administrator'
      }
    ]
  },

  automod: {
    label:       '🤖 Auto-Mod',
    description: 'Automatic word filtering and chat auto-responses.',
    commands: [
      {
        name: '/censor add',
        usage: '/censor add <pattern> [severity] [is_regex]',
        description: 'Add a word, wildcard pattern, or regex to the filter list.',
        perms: 'Manage Server'
      },
      {
        name: '/censor remove',
        usage: '/censor remove <pattern>',
        description: 'Remove a pattern from the filter list.',
        perms: 'Manage Server'
      },
      {
        name: '/censor list',
        usage: '/censor list',
        description: 'View all filtered words/patterns.',
        perms: 'Manage Server'
      },
      {
        name: '/censor toggle',
        usage: '/censor toggle <enabled>',
        description: 'Turn the entire censor system on or off.',
        perms: 'Manage Server'
      },
      {
        name: '/censor config',
        usage: '/censor config [...]',
        description: 'Configure extra filters (links, caps, mentions) and escalation thresholds.',
        perms: 'Manage Server'
      },
      {
        name: '/censor exempt',
        usage: '/censor exempt <type> <add|remove> [role] [channel]',
        description: 'Exempt a role or channel from the censor filter.',
        perms: 'Manage Server'
      },
      {
        name: '/censor test',
        usage: '/censor test <message>',
        description: 'Preview whether a message would be caught — nothing is actually deleted.',
        perms: 'Manage Server'
      },
      {
        name: '/censor violations',
        usage: '/censor violations <member>',
        description: 'View a member\'s censor violation history.',
        perms: 'Manage Server'
      },
      {
        name: '/autoresponder add',
        usage: '/autoresponder add <trigger> <response> [match_type] [user_cooldown] [global_cooldown]',
        description: 'Create an automatic reply when a keyword/phrase is mentioned in chat.',
        perms: 'Manage Server'
      },
      {
        name: '/autoresponder list',
        usage: '/autoresponder list',
        description: 'View all configured auto-responder triggers.',
        perms: 'Manage Server'
      },
      {
        name: '/autoresponder toggle',
        usage: '/autoresponder toggle <trigger_id>',
        description: 'Enable or disable a specific trigger.',
        perms: 'Manage Server'
      },
      {
        name: '/autoresponder test',
        usage: '/autoresponder test <message>',
        description: 'Preview which trigger (if any) a message would fire.',
        perms: 'Manage Server'
      }
    ]
  },

  applications: {
    label:       '📋 Applications',
    description: 'Recruitment/application panels with review and approval flow.',
    commands: [
      {
        name: '/application setup',
        usage: '/application setup <review_channel> <panel_channel> [log_channel] [support_role]',
        description: 'Configure where applications are reviewed and posted.',
        perms: 'Administrator'
      },
      {
        name: '/application design',
        usage: '/application design',
        description: 'Open the visual editor to build application panels with custom questions.',
        perms: 'Administrator'
      },
      {
        name: '/application info',
        usage: '/application info',
        description: 'View the current application system configuration.',
        perms: 'Administrator'
      },
      {
        name: '/application enable / disable',
        usage: '/application enable | /application disable',
        description: 'Turn application submissions on or off without unpublishing the panel.',
        perms: 'Administrator'
      },
      {
        name: '/application setrole',
        usage: '/application setrole [role]',
        description: 'Update the support role allowed to review applications.',
        perms: 'Administrator'
      },
      {
        name: '/application submissions',
        usage: '/application submissions [filter] [member]',
        description: 'View pending/accepted/rejected applications.',
        perms: 'Administrator or Support Role'
      }
    ]
  },

  rolesconnection: {
    label:       '🔗 Roles Connection',
    description: 'Automatically add/remove roles based on other roles a member has.',
    commands: [
      {
        name: '/roles-connection setup',
        usage: '/roles-connection setup <action> [trigger_role] [effect] [target_role] [condition_id]',
        description: 'Add, list, edit, toggle, or remove a role condition.',
        perms: 'Manage Roles'
      },
      {
        name: '/roles-connection apply',
        usage: '/roles-connection apply <bots_included> [dry_run]',
        description: 'Apply all conditions to every member right now. Use dry_run to preview without changing anything.',
        perms: 'Manage Roles'
      },
      {
        name: '/roles-connection history',
        usage: '/roles-connection history',
        description: 'View the last 10 apply runs.',
        perms: 'Manage Roles'
      }
    ]
  },

  reactivity: {
    label:       '💬 Chat Reactivity',
    description: 'Ping roles/users when a channel goes quiet for too long.',
    commands: [
      {
        name: '/chat-reactivity setup',
        usage: '/chat-reactivity setup <channel> <role> <inactivity_minutes> [ping_mode] [cooldown_minutes] [min_message_threshold] [message]',
        description: 'Create or update an inactivity monitor for a channel.',
        perms: 'Manage Server'
      },
      {
        name: '/chat-reactivity businesshours',
        usage: '/chat-reactivity businesshours <monitor_id> <enabled> [start_hour] [end_hour] [utc_offset] [skip_weekends]',
        description: 'Restrict pings to specific hours/days only.',
        perms: 'Manage Server'
      },
      {
        name: '/chat-reactivity addping',
        usage: '/chat-reactivity addping <monitor_id> [role] [user]',
        description: 'Add an additional role or user to ping for a monitor.',
        perms: 'Manage Server'
      },
      {
        name: '/chat-reactivity snooze',
        usage: '/chat-reactivity snooze <monitor_id> <hours>',
        description: 'Temporarily pause a monitor without disabling it.',
        perms: 'Manage Server'
      },
      {
        name: '/chat-reactivity list',
        usage: '/chat-reactivity list',
        description: 'View all monitors and their current state.',
        perms: 'Manage Server'
      },
      {
        name: '/chat-reactivity history',
        usage: '/chat-reactivity history',
        description: 'View the last 30 pings sent by the system.',
        perms: 'Manage Server'
      },
      {
        name: '/chat-reactivity toggle / remove',
        usage: '/chat-reactivity toggle <monitor_id> | /chat-reactivity remove <monitor_id>',
        description: 'Enable/disable or permanently delete a monitor.',
        perms: 'Manage Server'
      }
    ]
  },

  utility: {
    label:       '🔧 Utility',
    description: 'General utility and information commands.',
    commands: [
      {
        name: '/userinfo',
        usage: '/userinfo [user]',
        description: 'View detailed information about a user — join dates, roles, and more.',
        perms: 'None'
      },
      {
        name: '/serverinfo',
        usage: '/serverinfo',
        description: 'View detailed information about the server.',
        perms: 'None'
      },
      {
        name: '/avatar',
        usage: '/avatar [user]',
        description: "View a user's full avatar. Defaults to your own.",
        perms: 'None'
      }
    ]
  }
};

// ── Build home embed ───────────────────────────────────────────────────────────
function buildHomeEmbed(guild) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle('📖  Apex — Command Help')
    .setDescription(
      `Welcome to **Apex**, your all-in-one server management bot.\n` +
      `Use the dropdown below to explore commands by category.\n\n` +
      `**\`[ ]\`** = Required  **\`( )\`** = Optional`
    )
    .addFields(
      { name: '🔨 Moderation',        value: '`12 commands`', inline: true },
      { name: '🎭 Role Management',   value: '`2 commands`',  inline: true },
      { name: '📋 Log System',        value: '`5 commands`',  inline: true },
      { name: '🎫 Ticket System',     value: '`2 commands`',  inline: true },
      { name: '🚨 Report System',     value: '`4 commands`',  inline: true },
      { name: '🎨 Interaction Studio',value: '`1 command`',   inline: true },
      { name: '🛡️ Anti-Raid',         value: '`7 commands`',  inline: true },
      { name: '🤖 Auto-Mod',          value: '`12 commands`', inline: true },
      { name: '📋 Applications',      value: '`6 commands`',  inline: true },
      { name: '🔗 Roles Connection',  value: '`3 commands`',  inline: true },
      { name: '💬 Chat Reactivity',   value: '`7 commands`',  inline: true },
      { name: '🔧 Utility',           value: '`3 commands`',  inline: true }
    )
    .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
    .setTimestamp()
    .setFooter(FOOTER);
}

// ── Build category embed ───────────────────────────────────────────────────────
function buildCategoryEmbed(catKey) {
  const cat = CATEGORIES[catKey];

  const fields = cat.commands.map(cmd => ({
    name:   `${cmd.name}`,
    value:
      `📌 **Usage:** \`${cmd.usage}\`\n` +
      `📄 ${cmd.description}\n` +
      `🔒 **Requires:** \`${cmd.perms}\``,
    inline: false
  }));

  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(`${cat.label} — Commands`)
    .setDescription(cat.description)
    .addFields(fields)
    .setTimestamp()
    .setFooter(FOOTER);
}

// ── Build select menu ──────────────────────────────────────────────────────────
function buildSelectMenu(currentCat = null) {
  const options = [
    { label: '🏠 Home',               value: 'home',            description: 'Back to the main help page' },
    { label: '🔨 Moderation',         value: 'moderation',      description: '12 commands' },
    { label: '🎭 Role Management',     value: 'roles',           description: '2 commands'  },
    { label: '📋 Log System',          value: 'logging',         description: '5 commands'  },
    { label: '🎫 Ticket System',       value: 'tickets',         description: '2 commands'  },
    { label: '🚨 Report System',       value: 'reports',         description: '4 commands'  },
    { label: '🎨 Interaction Studio',  value: 'interaction',     description: '1 command'   },
    { label: '🛡️ Anti-Raid',           value: 'antiraid',        description: '7 commands'  },
    { label: '🤖 Auto-Mod',            value: 'automod',         description: '12 commands' },
    { label: '📋 Applications',        value: 'applications',    description: '6 commands'  },
    { label: '🔗 Roles Connection',    value: 'rolesconnection', description: '3 commands'  },
    { label: '💬 Chat Reactivity',     value: 'reactivity',      description: '7 commands'  },
    { label: '🔧 Utility',             value: 'utility',         description: '3 commands'  }
  ].map(opt => ({
    ...opt,
    default: opt.value === (currentCat ?? 'home')
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_menu')
      .setPlaceholder('Select a category...')
      .addOptions(options)
  );
}

// ── Command export ─────────────────────────────────────────────────────────────
module.exports = {
  name: 'help',
  description: 'Browse all Apex commands by category',

  async execute(interaction) {
    const homeEmbed = buildHomeEmbed(interaction.guild);
    const row       = buildSelectMenu('home');

    const reply = await interaction.reply({
      embeds: [homeEmbed],
      components: [row],
      fetchReply: true
    });

    // ── Collector — listen for dropdown changes ────────────────────────────────
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 5 * 60 * 1000 // 5 minutes
    });

    collector.on('collect', async i => {
      // Only the original user can interact
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('Red')
              .setDescription('❌ This menu is not for you. Run `/help` yourself.')
              .setFooter(FOOTER)
          ],
          ephemeral: true
        });
      }

      const selected = i.values[0];
      const newRow   = buildSelectMenu(selected);

      if (selected === 'home') {
        await i.update({
          embeds:     [buildHomeEmbed(interaction.guild)],
          components: [newRow]
        });
      } else {
        await i.update({
          embeds:     [buildCategoryEmbed(selected)],
          components: [newRow]
        });
      }
    });

    // ── On timeout — disable the dropdown ─────────────────────────────────────
    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        StringSelectMenuBuilder.from(row.components[0]).setDisabled(true)
      );
      await interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
  }
};
