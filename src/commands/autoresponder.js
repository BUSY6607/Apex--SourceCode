const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

const AutoResponder = require('../models/AutoResponder');

const FOOTER = { text: 'Apex • Auto-Responder' };

// ── Generate a short unique trigger ID ────────────────────────────────────────
function genTriggerId() {
  return `AR-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

module.exports = {
  name: 'autoresponder',
  description: 'Manage the Auto-Responder system',

  options: [

    // ── /autoresponder add ──────────────────────────────────────────────────
    {
      name: 'add',
      description: 'Add a new auto-responder trigger',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'trigger',
          description: 'The keyword/phrase to match',
          type: ApplicationCommandOptionType.String,
          required: true
        },
        {
          name: 'response',
          description: 'The response text (use | to separate multiple random responses)',
          type: ApplicationCommandOptionType.String,
          required: true
        },
        {
          name: 'match_type',
          description: 'How to match the trigger (default: contains)',
          type: ApplicationCommandOptionType.String,
          required: false,
          choices: [
            { name: 'Contains',    value: 'contains'   },
            { name: 'Exact',       value: 'exact'       },
            { name: 'Starts With', value: 'startswith'  },
            { name: 'Ends With',   value: 'endswith'    },
            { name: 'Regex',       value: 'regex'       }
          ]
        },
        {
          name: 'user_cooldown',
          description: 'Per-user cooldown in seconds (default: 0)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 0,
          maxValue: 3600
        },
        {
          name: 'global_cooldown',
          description: 'Global cooldown in seconds (default: 0)',
          type: ApplicationCommandOptionType.Integer,
          required: false,
          minValue: 0,
          maxValue: 3600
        }
      ]
    },

    // ── /autoresponder remove ───────────────────────────────────────────────
    {
      name: 'remove',
      description: 'Remove a trigger by its ID',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'trigger_id',
          description: 'The trigger ID (e.g. AR-1A2B3)',
          type: ApplicationCommandOptionType.String,
          required: true
        }
      ]
    },

    // ── /autoresponder list ─────────────────────────────────────────────────
    {
      name: 'list',
      description: 'List all auto-responder triggers',
      type: ApplicationCommandOptionType.Subcommand
    },

    // ── /autoresponder toggle ───────────────────────────────────────────────
    {
      name: 'toggle',
      description: 'Enable or disable a specific trigger',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'trigger_id',
          description: 'The trigger ID to toggle',
          type: ApplicationCommandOptionType.String,
          required: true
        }
      ]
    },

    // ── /autoresponder edit ─────────────────────────────────────────────────
    {
      name: 'edit',
      description: 'Edit the response of an existing trigger',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'trigger_id',
          description: 'The trigger ID to edit',
          type: ApplicationCommandOptionType.String,
          required: true
        },
        {
          name: 'new_response',
          description: 'New response text (use | for multiple random responses)',
          type: ApplicationCommandOptionType.String,
          required: true
        }
      ]
    },

    // ── /autoresponder test ─────────────────────────────────────────────────
    {
      name: 'test',
      description: 'Test if a message would trigger any responder (ephemeral)',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'message',
          description: 'The message content to test',
          type: ApplicationCommandOptionType.String,
          required: true
        }
      ]
    },

    // ── /autoresponder system ───────────────────────────────────────────────
    {
      name: 'system',
      description: 'Enable or disable the entire auto-responder system',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'enabled',
          description: 'Turn the system on or off',
          type: ApplicationCommandOptionType.Boolean,
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
            .setDescription('You need **Manage Server** permission to manage Auto-Responder.')
            .setFooter(FOOTER)
        ],
        ephemeral: true
      });
    }

    const sub   = interaction.options.getSubcommand();
    const gid   = interaction.guild.id;

    // Ensure guild doc exists
    let arDoc = await AutoResponder.findOne({ guildId: gid });
    if (!arDoc) arDoc = await AutoResponder.create({ guildId: gid });

    await interaction.deferReply({ ephemeral: true });

    // ══════════════════════════════════════════════════════════════════════
    // ADD
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'add') {
      const trigger    = interaction.options.getString('trigger').trim();
      const rawResp    = interaction.options.getString('response');
      const matchType  = interaction.options.getString('match_type')    || 'contains';
      const userCd     = interaction.options.getInteger('user_cooldown')  ?? 0;
      const globalCd   = interaction.options.getInteger('global_cooldown') ?? 0;

      // Cap check
      if (arDoc.triggers.length >= arDoc.maxTriggers) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Red')
              .setTitle('❌ Trigger Cap Reached')
              .setDescription(`This server has reached the maximum of **${arDoc.maxTriggers}** triggers.`)
              .setFooter(FOOTER)
          ]
        });
      }

      // Regex validation
      if (matchType === 'regex') {
        try { new RegExp(trigger); } catch {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setColor('Red')
                .setTitle('❌ Invalid Regex')
                .setDescription('The pattern you entered is not a valid regular expression.')
                .setFooter(FOOTER)
            ]
          });
        }
      }

      const responses = rawResp.split('|').map(s => s.trim()).filter(Boolean);
      const respType  = responses.length > 1 ? 'random' : 'text';
      const triggerId = genTriggerId();

      arDoc.triggers.push({
        triggerId,
        type:           matchType,
        trigger,
        responseType:   respType,
        responses,
        userCooldown:   userCd,
        globalCooldown: globalCd
      });
      await arDoc.save();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('✅ Trigger Added')
            .addFields(
              { name: '🆔 Trigger ID',   value: `\`${triggerId}\``,                       inline: true  },
              { name: '🔍 Match Type',    value: matchType,                                inline: true  },
              { name: '💬 Keyword',       value: `\`${trigger}\``,                         inline: false },
              { name: '📝 Responses',     value: responses.map(r => `• ${r}`).join('\n').slice(0, 1000), inline: false },
              { name: '⏱️ User CD',       value: `${userCd}s`,                             inline: true  },
              { name: '🌐 Global CD',     value: `${globalCd}s`,                           inline: true  }
            )
            .setTimestamp()
            .setFooter(FOOTER)
        ]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // REMOVE
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'remove') {
      const tid = interaction.options.getString('trigger_id').toUpperCase();
      const idx = arDoc.triggers.findIndex(t => t.triggerId === tid);

      if (idx === -1) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Red')
              .setTitle('❌ Trigger Not Found')
              .setDescription(`No trigger with ID \`${tid}\` exists.`)
              .setFooter(FOOTER)
          ]
        });
      }

      const removed = arDoc.triggers[idx];
      arDoc.triggers.splice(idx, 1);
      await arDoc.save();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('🗑️ Trigger Removed')
            .addFields(
              { name: '🆔 ID',      value: `\`${removed.triggerId}\``, inline: true  },
              { name: '💬 Keyword', value: `\`${removed.trigger}\``,   inline: true  },
              { name: '🔥 Fired',   value: `${removed.fireCount}x`,    inline: true  }
            )
            .setTimestamp()
            .setFooter(FOOTER)
        ]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // LIST
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'list') {
      if (!arDoc.triggers.length) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Blue')
              .setTitle('📋 Auto-Responder Triggers')
              .setDescription('No triggers configured yet. Use `/autoresponder add` to create one.')
              .setFooter(FOOTER)
          ]
        });
      }

      const systemStatus = arDoc.enabled ? '🟢 Enabled' : '🔴 Disabled';

      // Show up to 15 triggers per list
      const shown  = arDoc.triggers.slice(0, 15);
      const fields = shown.map(t => ({
        name:  `${t.enabled ? '🟢' : '🔴'} \`${t.triggerId}\` — ${t.trigger.slice(0, 30)}`,
        value: `> **Type:** ${t.type} | **Responses:** ${t.responses.length} | **Fired:** ${t.fireCount}x`,
        inline: false
      }));

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('Blue')
            .setTitle('📋 Auto-Responder Triggers')
            .setDescription(
              `**System:** ${systemStatus} | **Triggers:** ${arDoc.triggers.length}/${arDoc.maxTriggers}` +
              (arDoc.triggers.length > 15 ? `\n*Showing 15 of ${arDoc.triggers.length}*` : '')
            )
            .addFields(fields)
            .setTimestamp()
            .setFooter(FOOTER)
        ]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // TOGGLE
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'toggle') {
      const tid = interaction.options.getString('trigger_id').toUpperCase();
      const t   = arDoc.triggers.find(t => t.triggerId === tid);

      if (!t) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Red')
              .setTitle('❌ Trigger Not Found')
              .setDescription(`No trigger with ID \`${tid}\` exists.`)
              .setFooter(FOOTER)
          ]
        });
      }

      t.enabled = !t.enabled;
      await arDoc.save();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(t.enabled ? 'Green' : 'Orange')
            .setTitle(`${t.enabled ? '🟢 Trigger Enabled' : '🔴 Trigger Disabled'}`)
            .addFields(
              { name: '🆔 ID',      value: `\`${t.triggerId}\``, inline: true },
              { name: '💬 Keyword', value: `\`${t.trigger}\``,   inline: true },
              { name: '📊 Status',  value: t.enabled ? 'Enabled' : 'Disabled', inline: true }
            )
            .setTimestamp()
            .setFooter(FOOTER)
        ]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // EDIT
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'edit') {
      const tid     = interaction.options.getString('trigger_id').toUpperCase();
      const rawResp = interaction.options.getString('new_response');
      const t       = arDoc.triggers.find(t => t.triggerId === tid);

      if (!t) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Red')
              .setTitle('❌ Trigger Not Found')
              .setDescription(`No trigger with ID \`${tid}\` exists.`)
              .setFooter(FOOTER)
          ]
        });
      }

      const responses = rawResp.split('|').map(s => s.trim()).filter(Boolean);
      t.responses     = responses;
      t.responseType  = responses.length > 1 ? 'random' : 'text';
      await arDoc.save();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('✏️ Trigger Updated')
            .addFields(
              { name: '🆔 ID',          value: `\`${t.triggerId}\``, inline: true  },
              { name: '💬 Keyword',      value: `\`${t.trigger}\``,   inline: true  },
              { name: '📝 New Responses', value: responses.map(r => `• ${r}`).join('\n').slice(0, 1000), inline: false }
            )
            .setTimestamp()
            .setFooter(FOOTER)
        ]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // TEST
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'test') {
      const testMsg = interaction.options.getString('message');

      if (!arDoc.enabled) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Orange')
              .setTitle('⚠️ System Disabled')
              .setDescription('The Auto-Responder system is currently disabled.')
              .setFooter(FOOTER)
          ]
        });
      }

      let matched = null;
      for (const t of arDoc.triggers) {
        if (!t.enabled) continue;
        const hay    = t.caseSensitive ? testMsg : testMsg.toLowerCase();
        const needle = t.caseSensitive ? t.trigger : t.trigger.toLowerCase();
        let hit = false;
        switch (t.type) {
          case 'exact':      hit = hay === needle; break;
          case 'contains':   hit = hay.includes(needle); break;
          case 'startswith': hit = hay.startsWith(needle); break;
          case 'endswith':   hit = hay.endsWith(needle); break;
          case 'regex': {
            try { hit = new RegExp(t.trigger, t.caseSensitive ? '' : 'i').test(testMsg); } catch { }
            break;
          }
        }
        if (hit) { matched = t; break; }
      }

      if (!matched) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('Blue')
              .setTitle('🔍 No Match')
              .setDescription(`No trigger matches: \`${testMsg.slice(0, 200)}\``)
              .setFooter(FOOTER)
          ]
        });
      }

      const preview = matched.responseType === 'random'
        ? matched.responses[Math.floor(Math.random() * matched.responses.length)]
        : matched.responses[0];

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('✅ Trigger Matched')
            .addFields(
              { name: '🆔 Trigger ID',   value: `\`${matched.triggerId}\``, inline: true  },
              { name: '🔍 Match Type',    value: matched.type,               inline: true  },
              { name: '💬 Keyword',       value: `\`${matched.trigger}\``,   inline: false },
              { name: '📝 Would Respond', value: preview?.slice(0, 500) || '*embed*', inline: false }
            )
            .setTimestamp()
            .setFooter(FOOTER)
        ]
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // SYSTEM TOGGLE
    // ══════════════════════════════════════════════════════════════════════
    if (sub === 'system') {
      const enabled  = interaction.options.getBoolean('enabled');
      arDoc.enabled  = enabled;
      await arDoc.save();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(enabled ? 'Green' : 'Red')
            .setTitle(`${enabled ? '🟢 Auto-Responder Enabled' : '🔴 Auto-Responder Disabled'}`)
            .setDescription(`The Auto-Responder system has been turned **${enabled ? 'ON' : 'OFF'}**.`)
            .setTimestamp()
            .setFooter(FOOTER)
        ]
      });
    }
  }
};
