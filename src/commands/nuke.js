const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require('discord.js');
const sendLog = require('../utils/Logsystem');

const FOOTER = { text: 'Apex • Moderation System' };

module.exports = {
  name: 'nuke',
  description: 'Instantly wipe a channel by cloning it (Admin only)',

  options: [
    {
      name: 'channel',
      description: 'Channel to nuke (defaults to current channel)',
      type: ApplicationCommandOptionType.Channel,
      required: false,
      channelTypes: [ChannelType.GuildText]
    }
  ],

  async execute(interaction) {

    // ── Permission check ───────────────────────────────────────────────────────
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setDescription('❌ You need **Administrator** permission to use this command.')
            .setFooter(FOOTER)
        ],
        ephemeral: true
      });
    }

    const target = interaction.options.getChannel('channel') ?? interaction.channel;

    // ── Channel type check ─────────────────────────────────────────────────────
    if (target.type !== ChannelType.GuildText) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setDescription('❌ Target must be a **text channel**.')
            .setFooter(FOOTER)
        ],
        ephemeral: true
      });
    }

    // ── Bot permission check ───────────────────────────────────────────────────
    const botMember = interaction.guild.members.me;
    if (
      !target.permissionsFor(botMember).has(PermissionFlagsBits.ManageChannels)
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setDescription(`❌ I don't have **Manage Channels** permission in ${target}.`)
            .setFooter(FOOTER)
        ],
        ephemeral: true
      });
    }

    const sameChannel = target.id === interaction.channel.id;
if (!sameChannel) await interaction.deferReply({ ephemeral: true });

    try {
      // ── Clone the channel ────────────────────────────────────────────────────
      const cloned = await target.clone({
        name:     target.name,
        topic:    target.topic ?? undefined,
        nsfw:     target.nsfw,
        parent:   target.parent ?? undefined,
        reason:   `Nuke executed by ${interaction.user.tag}`
      });

      // Position the clone exactly where the original was
      await cloned.setPosition(target.position);

      // ── Delete the original ──────────────────────────────────────────────────
      await target.delete(`Nuke executed by ${interaction.user.tag}`);

      // ── Success reply ────────────────────────────────────────────────────────
      const successEmbed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('✅ Channel Nuked Successfully')
        .setFooter(FOOTER);

      if (sameChannel) {
        await cloned.send({ embeds: [successEmbed] });
      } else {
        await interaction.editReply({ embeds: [successEmbed] });
      }

      // ── Professional log embed ───────────────────────────────────────────────
      const logEmbed = new EmbedBuilder()
        .setColor(0xFF4500)
        .setTitle('💥  Channel Nuked')
        .setDescription('A channel has been wiped clean via the nuke command.')
        .addFields(
          {
            name: '📌  Channel',
            value: `${cloned} \`#${cloned.name}\``,
            inline: true
          },
          {
            name: '🆔  Channel ID',
            value: `\`${cloned.id}\``,
            inline: true
          },
          {
            name: '🗑️  Original ID',
            value: `\`${target.id}\``,
            inline: true
          },
          {
            name: '🛡️  Moderator',
            value: `${interaction.user} \`${interaction.user.tag}\``,
            inline: true
          },
          {
            name: '🪪  Moderator ID',
            value: `\`${interaction.user.id}\``,
            inline: true
          },
          {
            name: '📂  Category',
            value: target.parent ? `\`${target.parent.name}\`` : '`None`',
            inline: true
          },
          {
            name: '📋  Topic',
            value: target.topic ? `\`${target.topic}\`` : '`No topic set`',
            inline: false
          },
          {
            name: '⏰  Executed At',
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: false
          }
        )
        .setTimestamp()
        .setFooter(FOOTER);

      await sendLog(interaction.guild, 'moderation', logEmbed);

      console.log(`[NUKE] ${interaction.user.tag} nuked #${target.name} (${target.id}) → cloned as ${cloned.id}`);

    } catch (error) {
      console.error('[NUKE] Error:', error);
      const errEmbed = new EmbedBuilder()
        .setColor('Red')
        .setDescription(`❌ Something went wrong: \`${error.message}\``)
        .setFooter(FOOTER);

      if (sameChannel) {
        try { await interaction.reply({ embeds: [errEmbed], ephemeral: true }); } catch (_) {}
      } else {
        await interaction.editReply({ embeds: [errEmbed] });
      }
    }
  }
};
