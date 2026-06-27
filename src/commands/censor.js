const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

const CensorConfig    = require('../models/CensorConfig');
const CensorViolation = require('../models/CensorViolation');

const FOOTER = { text: 'Apex • Auto-Censor' };

module.exports = {
  name: 'censor',
  description: 'Manage the Auto-Censor (word filter) system',

  options: [

    // ── /censor add ─────────────────────────────────────────────────────────
    {
      name: 'add',
      description: 'Add a word or pattern to the filter list',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'pattern',
          description: 'Word, wildcard (f*ck), or regex pattern to block',
          type: ApplicationCommandOptionType.String,
          required: true
        },
        {
          name: 'severity',
          description: 'Violation severity (default: low)',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: 'Low    — delete + escalation',  value: 'low'    },
            { name: 'Medium — delete + escalation',  value: 'medium' },
            { name: 'High   — instant ban',          value: 'high'   }
          ]
        },
        {
          name: 'is_regex',
          description: 'Treat the pattern as a regex (default: false)',
          type: ApplicationCommandOptionType.Boolean,
          required: false
        }
      ]
    },

    // ── /censor remove ──────────────────────────────────────────────────────
    {
      name: 'remove',
      description: 'Remove a word/pattern from the filter list by index',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'pattern',
          description: 'The exact pattern to remove',
          type: ApplicationCommandOptionType.String,
          required: true
        }
      ]
    },

    // ── /censor list ────────────────────────────────────────────────────────
    {
      name: 'list',
      description: 'List all filtered words/patterns',
      type: ApplicationCommandOptionType.Subcommand
    },

    // ── /censor toggle ──────────────────────────────────────────────────────
    {
      name: 'toggle',
      description: 'Enable or disable the entire censor system',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'enabled',
          description: 'Turn the censor system on or off',
          type: ApplicationCommandOptionType.Boolean,
          required: true
        }
      ]
    },

    // ── /censor config ──────────────────────────────────────────────────────
    {
      name: 'config',
      description: 'Configure censor settings (thresholds, extra filters, exemptions)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'filter_invites',
          description: 'Block Discord invite links',
          type: ApplicationCommandOptionType.Boolean,
          required: false
        },
        {
          name: 'filter_links',
          description: 'Block all external links',
          type: ApplicationCommandOptionType.Boolean,
          required: false
        },
        {
          name: 'caps_threshold',
          description: 'Block messages X% uppercase (0 = disabled)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 0,
          maxValue: 100
        },
        {
          name: 'repeat_word_limit',
          description: 'Block if same word repeats N times (0 = disabled)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 0,
          maxValue: 50
        },
        {
          name: 'mass_mention_limit',
          description: 'Block messages with N+ mentions (0 = disabled)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 0,
          maxValue: 50
        },
        {
          name: 'timeout_duration',
          description: 'Auto-timeout duration in minutes (default: 10)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 1,
          maxValue: 1440
        },
        {
          name: 'dm_on_delete',
          description: 'DM the user when their message is removed',
          type: ApplicationCommandOptionType.Boolean,
          required: false
        },
        {
          name: 'warn_threshold',
          description: 'Violations before warn (default: 1)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 1
        },
        {
          name: 'timeout_threshold',
          description: 'Violations before timeout (default: 3)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 1
        },
        {
          name: 'kick_threshold',
          description: 'Violations before kick (default: 5)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 1
        },
        {
          name: 'ban_threshold',
          description: 'Violations before ban (default: 7)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 1
        }
      ]
    },

    // ── /censor exempt ──────────────────────────────────────────────────────
    {
      name: 'exempt',
      description: 'Add or remove a role/channel exemption',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'type',
          description: 'Exempt a role or channel',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: 'Role',    value: 'role'    },
            { name: 'Channel', value: 'channel' }
          ]
        },
        {
          name: 'action',
          description: 'Add or remove the exemption',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: 'Add',    value: 'add'    },
            { name: 'Remove', value: 'remove' }
          ]
        },
        {
          name: 'role',
          description: 'The role to exempt',
          type: ApplicationCommandOptionType.Role,
          required: false
        },
        {
          name: 'channel',
          description: 'The channel to exempt',
          type: ApplicationCommandOptionType.Channel,
          required: false
        }
      ]
    },

    // ── /censor test ────────────────────────────────────────────────────────
    {
      name: 'test',
      description: 'Test if a message would be caught by the censor (mod only, ephemeral)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'message',
          description: 'The message text to test',
          type: ApplicationCommandOptionType.String,
          required: true
        }
      ]
    },

    // ── /censor violations ──────────────────────────────────────────────────
    {
      name: 'violations',
      description: 'View violation history for a member',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'member',
          description: 'The member to look up',
          type: ApplicationCommandOptionType.User,
          required: true
        }
      ]
    },

    // ── /censor clearviolations ─────────────────────────────────────────────
    {
      name: 'clearviolations',
      description: 'Clear violation history for a member',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'member',
          description: 'The member to clear',
          type: ApplicationCommandOptionType.User,
          required: true
        }
      ]
    }
  ],

  // ────────────────────────────────────────────────────────────────────────────
  async execute(interaction) {

    // ── Permission gate ────────────────────────────────────────────────────
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Permission Denied')
            .setDescription('You need **Manage Server** permission to manage the Censor system.')
            .setFooter(FOOTER)
        ],
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();
    const gid = interaction.guild.id;

    let cfg = await CensorConfig.findOne({ guildId: gid });
    if (!cfg) cfg = await CensorConfig.create({ guildId: gid });

    await interaction.deferReply({ ephemeral: true });

    // ══════════════════════════════════════════════════════════════════════
    // ADD
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'add') {
      const pattern  = interaction.options.getString('pattern').trim();
      const severity = interaction.options.getString('severity') || 'low';
      const isRegex  = interaction.options.getBoolean('is_regex') ?? false;

      // Validate regex if applicable
      if (isRegex) {
        try { new RegExp(pattern); } catch {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Invalid Regex')
                .setDescription('The pattern is not a valid regular expression.')
                .setFooter(FOOTER)
            ]
          });
        }
      }

      // Duplicate check
      if (cfg.words.some(w => w.pattern === pattern)) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Orange')
              .setTitle('⚠️ Already Exists')
              .setDescription(`\`${pattern}\` is already in the filter list.`)
              .setFooter(FOOTER)
          ]
        });
      }

      cfg.words.push({ pattern, isRegex, severity });
      await cfg.save();

      const sevEmoji = { low: '🟡', medium: '🟠', high: '🔴' }[severity];

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('✅ Pattern Added')
            .addFields(
              { name: '🔍 Pattern',  value: `\`${pattern}\``,           inline: true },
              { name: '⚡ Severity', value: `${sevEmoji} ${severity}`,  inline: true },
              { name: '🔧 Type',     value: isRegex ? 'Regex' : pattern.includes('*') ? 'Wildcard' : 'Text', inline: true }
            )
            .setFooter(FOOTER)
            .setTimestamp()
        ]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // REMOVE
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'remove') {
      const pattern = interaction.options.getString('pattern').trim();
      const idx     = cfg.words.findIndex(w => w.pattern === pattern);

      if (idx === -1) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Red')
              .setTitle('❌ Not Found')
              .setDescription(`\`${pattern}\` is not in the filter list.`)
              .setFooter(FOOTER)
          ]
        });
      }

      cfg.words.splice(idx, 1);
      await cfg.save();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('🗑️ Pattern Removed')
            .setDescription(`\`${pattern}\` has been removed from the filter list.`)
            .setFooter(FOOTER)
            .setTimestamp()
        ]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // LIST
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'list') {
      const systemStatus = cfg.enabled ? '🟢 Enabled' : '🔴 Disabled';

      if (!cfg.words.length) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Blue')
              .setTitle('📋 Filter List')
              .setDescription('No words/patterns configured. Use `/censor add` to add one.')
              .setFooter(FOOTER)
          ]
        });
      }

      const sevEmoji = { low: '🟡', medium: '🟠', high: '🔴' };
      const shown    = cfg.words.slice(0, 20);
      const lines    = shown.map((w, i) =>
        `\`${i + 1}\` ${sevEmoji[w.severity] || '⚪'} \`${w.pattern}\` ${w.isRegex ? '*(regex)*' : ''}`
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('Blue')
            .setTitle('📋 Censor Filter List')
            .setDescription(
              `**System:** ${systemStatus} | **Patterns:** ${cfg.words.length}` +
              (cfg.words.length > 20 ? `\n*Showing 20 of ${cfg.words.length}*` : '') +
              '\n\n' + lines.join('\n')
            )
            .setFooter(FOOTER)
            .setTimestamp()
        ]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // TOGGLE
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      cfg.enabled   = enabled;
      await cfg.save();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(enabled ? 'Green' : 'Red')
            .setTitle(`${enabled ? '🟢 Censor System Enabled' : '🔴 Censor System Disabled'}`)
            .setDescription(`The Auto-Censor system has been turned **${enabled ? 'ON' : 'OFF'}**.`)
            .setFooter(FOOTER)
            .setTimestamp()
        ]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // CONFIG
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'config') {
      const changes = [];

      const filterInvites    = interaction.options.getBoolean('filter_invites');
      const filterLinks      = interaction.options.getBoolean('filter_links');
      const capsThreshold    = interaction.options.getInteger('caps_threshold');
      const repeatWordLimit  = interaction.options.getInteger('repeat_word_limit');
      const massMentionLimit = interaction.options.getInteger('mass_mention_limit');
      const timeoutDuration  = interaction.options.getInteger('timeout_duration');
      const dmOnDelete       = interaction.options.getBoolean('dm_on_delete');
      const warnTh           = interaction.options.getInteger('warn_threshold');
      const timeoutTh        = interaction.options.getInteger('timeout_threshold');
      const kickTh           = interaction.options.getInteger('kick_threshold');
      const banTh            = interaction.options.getInteger('ban_threshold');

      if (filterInvites    !== null) { cfg.filterInviteLinks = filterInvites;    changes.push(`Filter Invites: **${filterInvites}**`); }
      if (filterLinks      !== null) { cfg.filterAllLinks    = filterLinks;      changes.push(`Filter Links: **${filterLinks}**`); }
      if (capsThreshold    !== null) { cfg.capsThreshold     = capsThreshold;    changes.push(`Caps Threshold: **${capsThreshold}%**`); }
      if (repeatWordLimit  !== null) { cfg.repeatWordLimit   = repeatWordLimit;  changes.push(`Repeat Word Limit: **${repeatWordLimit}**`); }
      if (massMentionLimit !== null) { cfg.massMentionLimit  = massMentionLimit; changes.push(`Mass Mention Limit: **${massMentionLimit}**`); }
      if (timeoutDuration  !== null) { cfg.timeoutDuration   = timeoutDuration;  changes.push(`Timeout Duration: **${timeoutDuration}min**`); }
      if (dmOnDelete       !== null) { cfg.dmOnDelete        = dmOnDelete;       changes.push(`DM on Delete: **${dmOnDelete}**`); }
      if (warnTh           !== null) { cfg.thresholds.warn    = warnTh;          changes.push(`Warn Threshold: **${warnTh}**`); }
      if (timeoutTh        !== null) { cfg.thresholds.timeout = timeoutTh;       changes.push(`Timeout Threshold: **${timeoutTh}**`); }
      if (kickTh           !== null) { cfg.thresholds.kick    = kickTh;          changes.push(`Kick Threshold: **${kickTh}**`); }
      if (banTh            !== null) { cfg.thresholds.ban     = banTh;           changes.push(`Ban Threshold: **${banTh}**`); }

      if (!changes.length) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Blue')
              .setTitle('⚙️ Current Censor Config')
              .addFields(
                { name: '🚫 Filter Invites',    value: `${cfg.filterInviteLinks}`,               inline: true  },
                { name: '🔗 Filter Links',       value: `${cfg.filterAllLinks}`,                  inline: true  },
                { name: '🔤 Caps Threshold',     value: `${cfg.capsThreshold}%`,                  inline: true  },
                { name: '🔁 Repeat Word Limit',  value: `${cfg.repeatWordLimit}`,                 inline: true  },
                { name: '📣 Mass Mention Limit', value: `${cfg.massMentionLimit}`,                inline: true  },
                { name: '⏱️ Timeout Duration',   value: `${cfg.timeoutDuration}min`,              inline: true  },
                { name: '📨 DM on Delete',        value: `${cfg.dmOnDelete}`,                     inline: true  },
                { name: '📊 Thresholds',          value:
                  `Warn: **${cfg.thresholds.warn}** | Timeout: **${cfg.thresholds.timeout}** | Kick: **${cfg.thresholds.kick}** | Ban: **${cfg.thresholds.ban}**`,
                  inline: false
                }
              )
              .setFooter(FOOTER)
              .setTimestamp()
          ]
        });
      }

      await cfg.save();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('✅ Config Updated')
            .setDescription(changes.join('\n'))
            .setFooter(FOOTER)
            .setTimestamp()
        ]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // EXEMPT
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'exempt') {
      const type   = interaction.options.getString('type');
      const action = interaction.options.getString('action');
      const role   = interaction.options.getRole('role');
      const ch     = interaction.options.getChannel('channel');

      if (type === 'role' && !role) {
        return interaction.editReply({ content: '❌ Please provide a role.', ephemeral: true });
      }
      if (type === 'channel' && !ch) {
        return interaction.editReply({ content: '❌ Please provide a channel.', ephemeral: true });
      }

      const id      = type === 'role' ? role.id : ch.id;
      const listKey = type === 'role' ? 'exemptRoleIds' : 'exemptChannelIds';
      const label   = type === 'role' ? `<@&${id}>` : `<#${id}>`;

      if (action === 'add') {
        if (!cfg[listKey].includes(id)) {
          cfg[listKey].push(id);
          await cfg.save();
        }
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Green')
              .setTitle('✅ Exemption Added')
              .setDescription(`${label} is now exempt from the censor filter.`)
              .setFooter(FOOTER)
          ]
        });
      } else {
        const idx = cfg[listKey].indexOf(id);
        if (idx !== -1) { cfg[listKey].splice(idx, 1); await cfg.save(); }
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Orange')
              .setTitle('🗑️ Exemption Removed')
              .setDescription(`${label} is no longer exempt.`)
              .setFooter(FOOTER)
          ]
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // TEST
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'test') {
      const testMsg    = interaction.options.getString('message');
      const LEET_MAP   = { '4':'a','@':'a','8':'b','3':'e','€':'e','6':'g','9':'g','1':'i','!':'i','|':'i','0':'o','5':'s','$':'s','7':'t','+':'t','2':'z' };
      const normalised = testMsg
        .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
        .replace(/(.)\1{2,}/g, '$1$1')
        .split('').map(c => LEET_MAP[c] || c).join('')
        .toLowerCase();

      let matchedPattern = null;
      let matchedSev     = null;

      for (const entry of cfg.words) {
        let hit = false;
        if (entry.isRegex) {
          try { hit = new RegExp(entry.pattern, 'i').test(normalised); } catch {}
        } else if (entry.pattern.includes('*')) {
          const re = new RegExp(entry.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.+'), 'i');
          hit = re.test(normalised);
        } else {
          hit = normalised.includes(entry.pattern.toLowerCase());
        }
        if (hit) { matchedPattern = entry.pattern; matchedSev = entry.severity; break; }
      }

      // Check extra filters too
      if (!matchedPattern) {
        if (cfg.filterInviteLinks && /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/\S+/i.test(testMsg)) {
          matchedPattern = 'Discord invite link'; matchedSev = 'low';
        } else if (cfg.filterAllLinks && /https?:\/\/\S+/i.test(testMsg)) {
          matchedPattern = 'External link'; matchedSev = 'low';
        }
      }

      const sevEmoji = { low: '🟡', medium: '🟠', high: '🔴' };

      if (!matchedPattern) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Green')
              .setTitle('✅ Message Would Pass')
              .setDescription(`No filter match found for: \`${testMsg.slice(0, 200)}\``)
              .setFooter(FOOTER)
          ]
        });
      }

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('🚫 Message Would Be Blocked')
            .addFields(
              { name: '🔍 Matched Pattern', value: `\`${matchedPattern}\``,              inline: true },
              { name: '⚡ Severity',         value: `${sevEmoji[matchedSev]} ${matchedSev}`, inline: true },
              { name: '💬 Normalised As',    value: `\`${normalised.slice(0, 200)}\``,   inline: false }
            )
            .setFooter(FOOTER)
        ]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // VIOLATIONS
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'violations') {
      const target = interaction.options.getUser('member');
      const doc    = await CensorViolation.findOne({ guildId: gid, userId: target.id });

      if (!doc || !doc.violations.length) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Green')
              .setTitle('✅ No Violations')
              .setDescription(`${target} has no censor violations.`)
              .setFooter(FOOTER)
          ]
        });
      }

      const WINDOW_MS  = 30 * 60 * 1000;
      const cutoff     = Date.now() - WINDOW_MS;
      const recentCount = doc.violations.filter(v => new Date(v.at).getTime() > cutoff).length;

      const shown = doc.violations.slice(-10).reverse();
      const fields = shown.map((v, i) => ({
        name:  `#${i + 1}  •  ${v.action?.toUpperCase() || 'DELETE'}`,
        value: `> **Pattern:** \`${v.matchedPattern}\`\n> **Channel:** <#${v.channelId}>\n> **When:** <t:${Math.floor(new Date(v.at).getTime() / 1000)}:R>`,
        inline: false
      }));

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('Orange')
            .setTitle(`📋 Violations — ${target.tag}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .setDescription(
              `**Total Violations:** ${doc.totalViolations} | **Last 30min:** ${recentCount}` +
              (doc.violations.length > 10 ? `\n*Showing last 10*` : '')
            )
            .addFields(fields)
            .setTimestamp()
            .setFooter(FOOTER)
        ]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // CLEAR VIOLATIONS
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'clearviolations') {
      const target = interaction.options.getUser('member');

      await CensorViolation.deleteOne({ guildId: gid, userId: target.id });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('🗑️ Violations Cleared')
            .setDescription(`All censor violations for ${target} have been cleared.`)
            .setFooter(FOOTER)
            .setTimestamp()
        ]
      });
    }
  }
};
