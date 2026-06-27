const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

const Warning = require('../models/Warning');

const FOOTER = { text: 'Apex • Moderation System' };

module.exports = {
  name: 'warnings',
  description: 'View, remove, or clear warnings for a member',

  options: [
    // ── /warnings view <member> ──────────────────────────────────────────────
    {
      name: 'view',
      description: 'View all warnings for a member',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'member',
          description: 'Member whose warnings you want to view',
          type: ApplicationCommandOptionType.User,
          required: true
        }
      ]
    },
    // ── /warnings remove <id> ────────────────────────────────────────────────
    {
      name: 'remove',
      description: 'Remove a specific warning by its ID',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'warn_id',
          description: 'The warning ID to remove (e.g. WARN-ABC123)',
          type: ApplicationCommandOptionType.String,
          required: true
        }
      ]
    },
    // ── /warnings clear <member> ─────────────────────────────────────────────
    {
      name: 'clear',
      description: 'Clear all warnings for a member',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'member',
          description: 'Member whose warnings you want to clear',
          type: ApplicationCommandOptionType.User,
          required: true
        }
      ]
    }
  ],

  async execute(interaction) {

    // ── Permission check ───────────────────────────────────────────────────────
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Permission Denied')
            .setDescription('You need **Moderate Members** permission to manage warnings.')
            .setFooter(FOOTER)
        ],
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();

    // ════════════════════════════════════════════════════════════════
    // /warnings view
    // ════════════════════════════════════════════════════════════════
    if (sub === 'view') {
      const targetUser = interaction.options.getUser('member');

      const warns = await Warning.find({
        guildId: interaction.guild.id,
        userId:  targetUser.id
      }).sort({ createdAt: -1 });

      if (warns.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('Green')
              .setTitle('✅ No Warnings')
              .setDescription(`${targetUser} has no warnings in this server.`)
              .setFooter(FOOTER)
          ]
        });
      }

      // Build field per warning (max 10 shown to stay under embed limits)
      const shown = warns.slice(0, 10);
      const fields = shown.map((w, i) => ({
        name: `#${warns.length - i}  •  \`${w.warnId}\``,
        value:
          `> **Reason:** ${w.reason}\n` +
          `> **Moderator:** <@${w.moderatorId}>\n` +
          `> **Date:** <t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:R>`,
        inline: false
      }));

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Orange')
            .setTitle(`⚠️ Warnings — ${targetUser.tag}`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .setDescription(
              `**Total Warnings:** ${warns.length}` +
              (warns.length > 10 ? `\n*Showing latest 10 of ${warns.length}*` : '')
            )
            .addFields(fields)
            .setTimestamp()
            .setFooter(FOOTER)
        ]
      });
    }

    // ════════════════════════════════════════════════════════════════
    // /warnings remove
    // ════════════════════════════════════════════════════════════════
    if (sub === 'remove') {
      const warnId = interaction.options.getString('warn_id').toUpperCase();

      const warning = await Warning.findOne({
        guildId: interaction.guild.id,
        warnId
      });

      if (!warning) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('Red')
              .setTitle('❌ Warning Not Found')
              .setDescription(`No warning with ID \`${warnId}\` exists in this server.`)
              .setFooter(FOOTER)
          ],
          ephemeral: true
        });
      }

      await Warning.deleteOne({ _id: warning._id });

      const remaining = await Warning.countDocuments({
        guildId: interaction.guild.id,
        userId:  warning.userId
      });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('🗑️ Warning Removed')
            .addFields(
              { name: '🆔  Warn ID',        value: `\`${warnId}\``,             inline: true  },
              { name: '👤  Member',          value: `<@${warning.userId}>`,      inline: true  },
              { name: '📊  Remaining Warns', value: `${remaining}`,              inline: true  },
              { name: '📄  Original Reason', value: warning.reason,              inline: false }
            )
            .setTimestamp()
            .setFooter(FOOTER)
        ]
      });
    }

    // ════════════════════════════════════════════════════════════════
    // /warnings clear
    // ════════════════════════════════════════════════════════════════
    if (sub === 'clear') {
      const targetUser = interaction.options.getUser('member');

      const count = await Warning.countDocuments({
        guildId: interaction.guild.id,
        userId:  targetUser.id
      });

      if (count === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('Green')
              .setTitle('✅ No Warnings')
              .setDescription(`${targetUser} has no warnings to clear.`)
              .setFooter(FOOTER)
          ],
          ephemeral: true
        });
      }

      await Warning.deleteMany({
        guildId: interaction.guild.id,
        userId:  targetUser.id
      });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('🗑️ Warnings Cleared')
            .addFields(
              { name: '👤  Member',           value: `${targetUser} \`${targetUser.tag}\``, inline: true },
              { name: '🗑️  Warnings Removed', value: `${count}`,                            inline: true }
            )
            .setTimestamp()
            .setFooter(FOOTER)
        ]
      });
    }
  }
};
