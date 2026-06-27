const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

const Warning  = require('../models/Warning');
const Logsystem = require('../utils/Logsystem');

const FOOTER = { text: 'Apex • Moderation System' };

module.exports = {
  name: 'warn',
  description: 'Issue a warning to a member',

  options: [
    {
      name: 'member',
      description: 'Member to warn',
      type: ApplicationCommandOptionType.User,
      required: true
    },
    {
      name: 'reason',
      description: 'Reason for the warning',
      type: ApplicationCommandOptionType.String,
      required: true
    }
  ],

  async execute(interaction) {

    // ── User permission check ──────────────────────────────────────────────────
    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Permission Denied')
            .setDescription('You need **Moderate Members** permission to warn someone.')
            .setFooter(FOOTER)
        ],
        ephemeral: true
      });
    }

    // ── Bot permission check ───────────────────────────────────────────────────
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Missing Bot Permission')
            .setDescription('I need **Moderate Members** permission to issue warnings.')
            .setFooter(FOOTER)
        ],
        ephemeral: true
      });
    }

    const targetUser   = interaction.options.getUser('member');
    const reason       = interaction.options.getString('reason');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    // ── Target not in server ───────────────────────────────────────────────────
    if (!targetMember) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Member Not Found')
            .setDescription('That user is not in this server.')
            .setFooter(FOOTER)
        ],
        ephemeral: true
      });
    }

    // ── Can't warn a bot ───────────────────────────────────────────────────────
    if (targetUser.bot) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Action Denied')
            .setDescription('You cannot warn a bot.')
            .setFooter(FOOTER)
        ],
        ephemeral: true
      });
    }

    // ── Can't warn yourself ────────────────────────────────────────────────────
    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Action Denied')
            .setDescription('You cannot warn yourself.')
            .setFooter(FOOTER)
        ],
        ephemeral: true
      });
    }

    // ── Can't warn server owner ────────────────────────────────────────────────
    if (targetMember.id === interaction.guild.ownerId) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Action Denied')
            .setDescription('You cannot warn the server owner.')
            .setFooter(FOOTER)
        ],
        ephemeral: true
      });
    }

    // ── Role hierarchy ─────────────────────────────────────────────────────────
    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('❌ Action Denied')
            .setDescription('You cannot warn someone with the same or higher role than you.')
            .setFooter(FOOTER)
        ],
        ephemeral: true
      });
    }

    await interaction.deferReply();

    // ── Generate unique warn ID ────────────────────────────────────────────────
    const warnId = `WARN-${Date.now().toString(36).toUpperCase()}`;

    // ── Save to DB ─────────────────────────────────────────────────────────────
    await Warning.create({
      guildId:     interaction.guild.id,
      userId:      targetUser.id,
      moderatorId: interaction.user.id,
      reason,
      warnId
    });

    // ── Total warnings for this user ───────────────────────────────────────────
    const totalWarnings = await Warning.countDocuments({
      guildId: interaction.guild.id,
      userId:  targetUser.id
    });

    // ── DM the warned user ─────────────────────────────────────────────────────
    const dmEmbed = new EmbedBuilder()
      .setColor('Orange')
      .setTitle('⚠️ You Have Been Warned')
      .addFields(
        { name: '🏠  Server',     value: interaction.guild.name,           inline: true },
        { name: '🆔  Warn ID',    value: `\`${warnId}\``,                  inline: true },
        { name: '📄  Reason',     value: reason,                           inline: false },
        { name: '📊  Total Warns',value: `${totalWarnings}`,               inline: true }
      )
      .setTimestamp()
      .setFooter(FOOTER);

    await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});

    // ── Success reply ──────────────────────────────────────────────────────────
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor('Orange')
          .setTitle('⚠️ Member Warned')
          .addFields(
            { name: '👤  Member',      value: `${targetUser} \`${targetUser.tag}\``, inline: true  },
            { name: '🆔  Warn ID',     value: `\`${warnId}\``,                       inline: true  },
            { name: '📊  Total Warns', value: `${totalWarnings}`,                    inline: true  },
            { name: '📄  Reason',      value: reason,                                inline: false }
          )
          .setTimestamp()
          .setFooter(FOOTER)
      ]
    });

    // ── Log embed ──────────────────────────────────────────────────────────────
    const logEmbed = new EmbedBuilder()
      .setColor('Orange')
      .setTitle('⚠️  Member Warned')
      .addFields(
        { name: '👤  Member',       value: `${targetUser} \`${targetUser.tag}\``,        inline: true  },
        { name: '🪪  Member ID',    value: `\`${targetUser.id}\``,                        inline: true  },
        { name: '📊  Total Warns',  value: `${totalWarnings}`,                            inline: true  },
        { name: '🛡️  Moderator',    value: `${interaction.user} \`${interaction.user.tag}\``, inline: true },
        { name: '🪪  Moderator ID', value: `\`${interaction.user.id}\``,                  inline: true  },
        { name: '🆔  Warn ID',      value: `\`${warnId}\``,                               inline: true  },
        { name: '📄  Reason',       value: reason,                                         inline: false },
        { name: '⏰  Issued At',    value: `<t:${Math.floor(Date.now() / 1000)}:F>`,       inline: false }
      )
      .setTimestamp()
      .setFooter(FOOTER);

    await Logsystem(interaction.guild, 'moderation', logEmbed);
  }
};
