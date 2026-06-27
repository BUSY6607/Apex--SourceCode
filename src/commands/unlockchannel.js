const {
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");

const Logsystem = require("../utils/Logsystem");

module.exports = {
  name: "unlockchannel",
  description: "Unlock a channel",

  permissionsRequired: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],

  options: [
    {
      name: "channel",
      description: "The channel you want to unlock",
      type: 7,
      required: false,
    },
  ],

  async execute(interaction) {

    // ===== USER PERMISSION =====
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Permission Denied")
            .setColor("Red")
            .setDescription("You need **Manage Channels** permission."),
        ],
        ephemeral: true,
      });
    }

    // ===== BOT PERMISSION =====
    const bot = interaction.guild.members.me;
    if (!bot.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Missing Bot Permission")
            .setColor("Red")
            .setDescription("I need **Manage Channels** permission."),
        ],
        ephemeral: true,
      });
    }

    const channel =
      interaction.options.getChannel("channel") || interaction.channel;

    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setDescription("❌ This command only works in text channels!"),
        ],
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    const everyone = interaction.guild.roles.everyone;

    const overwrite = channel.permissionOverwrites.cache.get(everyone.id);

    if (!overwrite || !overwrite.deny.has(PermissionFlagsBits.SendMessages)) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setDescription("🔓 Channel is already unlocked!"),
        ],
      });
    }

    // ===== RESET ONLY @EVERYONE =====
    await channel.permissionOverwrites.edit(everyone, {
      SendMessages: null,
      SendMessagesInThreads: null,
      CreatePublicThreads: null,
      CreatePrivateThreads: null,
      AddReactions: null,
    });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("Green")
          .setTitle("🔓 Channel Unlocked")
          .setFooter({ text: "Apex • Moderation System" }),
      ],
    });

    // ===== LOG =====
    const logEmbed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("Channel Unlocked")
      .setDescription(
        `📺 **Channel:** ${channel.name} (${channel.id})\n` +
        `👮 **Moderator:** ${interaction.user.tag} (${interaction.user.id})\n` +
        `🏠 **Server:** ${interaction.guild.name} (${interaction.guild.id})\n` +
        `🕒 **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
      );

    await Logsystem(interaction.guild, `channels`, logEmbed);
  },
};

