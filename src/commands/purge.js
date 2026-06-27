const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require(`discord.js`);

const Logsystem = require(`../utils/Logsystem`);

module.exports = {
  name: `purge`,
  description: `Bulk delete messages with advanced filters`,

  permissionsRequired: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],

  options: [
    {
      name: `amount`,
      description: `Number of messages to delete (1-100)`,
      type: ApplicationCommandOptionType.Integer,
      required: true,
    },
    {
      name: `user`,
      description: `Delete messages from a specific user`,
      type: ApplicationCommandOptionType.User,
      required: false,
    },
    {
      name: `bots`,
      description: `Delete only bot messages`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
    {
      name: `embeds`,
      description: `Delete only embed messages`,
      type: ApplicationCommandOptionType.Boolean,
      required: false,
    },
  ],

  async execute(interaction) {

    // ===== PERMISSIONS =====
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`❌ Permission Denied`)
            .setColor(`Red`)
            .setDescription(`You need **Manage Messages** permission.`)
            .setFooter({ text: "Apex • Moderation System" }),
        ],
        ephemeral: true,
      });
    }

    const bot = interaction.guild.members.me;
    if (!bot.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`❌ Missing Bot Permission`)
            .setColor(`Red`)
            .setDescription(`I need **Manage Messages** permission.`)
            .setFooter({ text: "Apex • Moderation System" }),
        ],
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });
    const replyMessage = await interaction.fetchReply(); 

    const amount = interaction.options.getInteger(`amount`);
    const user = interaction.options.getUser(`user`);
    const botsOnly = interaction.options.getBoolean(`bots`);
    const embedsOnly = interaction.options.getBoolean(`embeds`);

    const failEmbed = new EmbedBuilder()
      .setTitle(`❌ Purge Failed`)
      .setColor(`Red`)
      .setFooter({ text: "Apex • Moderation System" });

    if (amount < 1 || amount > 100) {
      return interaction.editReply({
        embeds: [
          failEmbed.setDescription(`You can delete between **1 and 100** messages only.`),
        ],
      });
    }

    // ===== FETCH + COLLECT =====
    let collected = [];
    let lastId;

    while (collected.length < amount) {
      const fetched = await interaction.channel.messages.fetch({
        limit: 100,
        before: lastId,
      });

      if (fetched.size === 0) break;

      for (const msg of fetched.values()) {

        if (msg.id === replyMessage.id) continue;

        // ===== FILTERS =====
        if (user && msg.author.id !== user.id) continue;

        if (botsOnly === true && !msg.author.bot) continue;
        if (botsOnly === false && msg.author.bot) continue;

        if (embedsOnly === true && msg.embeds.length === 0) continue;
        if (embedsOnly === false && msg.embeds.length > 0) continue;

        // ===== SKIP NON-DELETABLE =====
        if (!msg.deletable) continue;

        collected.push(msg);

        if (collected.length === amount) break;
      }

      lastId = fetched.last().id;
    }

    if (collected.length === 0) {
      return interaction.editReply({
        embeds: [
          failEmbed.setDescription(`No deletable messages found.`),
        ],
      });
    }

    // ===== DELETE =====
    const deleted = await interaction.channel.bulkDelete(collected, true);

    await interaction.deleteReply().catch(() => {});

    // ===== SUCCESS EMBED =====
    const successEmbed = new EmbedBuilder()
      .setTitle(`🧹 Messages Purged`)
      .setColor(`Green`)
      .setDescription(
        `> **Deleted:** ${deleted.size}\n` +
        `> **Moderator:** ${interaction.user.tag}` +
        (user ? `\n> **Target User:** ${user.tag}` : ``) +
        (botsOnly !== null ? `\n> **Bots Only:** ${botsOnly}` : ``) +
        (embedsOnly !== null ? `\n> **Embeds Only:** ${embedsOnly}` : ``)
      )
      .setFooter({ text: "Apex • Moderation System" });

    const msg = await interaction.channel.send({ embeds: [successEmbed] });

    setTimeout(() => {
      msg.delete().catch(() => {});
    }, 5000);

    // ===== LOG =====
    const logEmbed = new EmbedBuilder()
      .setColor(`Orange`)
      .setTitle(`Messages Purged`)
      .setDescription(
        `🧹 **Deleted:** ${deleted.size}\n` +
        `👮 **Moderator:** ${interaction.user.tag} (${interaction.user.id})\n` +
        (user ? `👤 **Target User:** ${user.tag} (${user.id})\n` : ``) +
        (botsOnly !== null ? `🤖 **Bots Only:** ${botsOnly}\n` : ``) +
        (embedsOnly !== null ? `🧩 **Embeds Only:** ${embedsOnly}\n` : ``) +
        `📺 **Channel:** ${interaction.channel.name} (${interaction.channel.id})\n` +
        `🏠 **Server:** ${interaction.guild.name} (${interaction.guild.id})\n` +
        `🕒 **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
      )
      .setFooter({ text: "Apex • Moderation System" });

    await Logsystem(interaction.guild, `moderation`, logEmbed);
  },
};