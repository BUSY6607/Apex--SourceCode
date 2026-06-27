const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const Logsystem = require("../utils/Logsystem");

module.exports = {
  name: "kick",
  description: "Kick a member from the server",

  options: [
    {
      name: "target-user",
      description: "User you want to kick",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for kicking",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  permissionsRequired: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],

  async execute(interaction, saim) {
    /* ================= USER PERMISSION CHECK ================= */
    if (
      !interaction.member.permissions.has(
        PermissionFlagsBits.KickMembers
      )
    ) {
      const embed = new EmbedBuilder()
        .setTitle(`❌ Permission Denied`)
        .setColor(`Red`)
        .setDescription(
          `You need **Kick Members** permission to use this command.`
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    /* ================= BOT PERMISSION CHECK ================= */
    const botMember = interaction.guild.members.me;

    if (
      !botMember.permissions.has(
        PermissionFlagsBits.KickMembers
      )
    ) {
      const embed = new EmbedBuilder()
        .setTitle(`❌ Missing Bot Permission`)
        .setColor(`Red`)
        .setDescription(
          `I need **Kick Members** permission to run this command.`
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    /* ================= DEFER ================= */
    await interaction.deferReply();

    const targetUser = interaction.options.getUser("target-user");
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    let targetMember;
    try {
      targetMember = await interaction.guild.members.fetch(
        targetUser.id
      );
    } catch {
      const embed = new EmbedBuilder()
        .setTitle(`❌ User not found`)
        .setColor(`Red`)
        .setDescription(`That user is not in this server.`);

      return interaction.editReply({ embeds: [embed] });
    }

    /* ================= OWNER CHECK ================= */
    if (targetMember.id === interaction.guild.ownerId) {
      const embed = new EmbedBuilder()
        .setTitle(`❌ Action Denied`)
        .setColor(`Red`)
        .setDescription(`You cannot kick the server owner.`);

      return interaction.editReply({ embeds: [embed] });
    }

    /* ================= ROLE HIERARCHY CHECK ================= */
    const targetRolePos = targetMember.roles.highest.position;
    const userRolePos = interaction.member.roles.highest.position;
    const botRolePos = botMember.roles.highest.position;

    if (targetRolePos >= userRolePos) {
      const embed = new EmbedBuilder()
        .setTitle(`❌ Action Denied`)
        .setColor(`Red`)
        .setDescription(
          `You cannot kick a user with the same or higher role than you.`
        );

      return interaction.editReply({ embeds: [embed] });
    }

    if (targetRolePos >= botRolePos) {
      const embed = new EmbedBuilder()
        .setTitle(`❌ Action Denied`)
        .setColor(`Red`)
        .setDescription(
          `I cannot kick this user because their role is higher than mine.`
        );

      return interaction.editReply({ embeds: [embed] });
    }

    /* ================= KICK ================= */
    try {
      await targetMember.kick(reason);

      const se = new EmbedBuilder() .setColor(`Green`) .setTitle(`✅️ ${targetUser.tag} kicked`)
      await interaction.editReply({ embeds: [se] });
        
        const logEmbed = new EmbedBuilder()

  .setColor(`Orange`)

  .setTitle(`Member Kicked`)

  .setDescription(

    `👤 **User:** ${targetUser.tag} (${targetUser.id})\n` +

    `👮 **Moderator:** ${interaction.user.tag} (${interaction.user.id})\n` +

    `📄 **Reason:** ${reason}\n` +

    `🏠 **Server:** ${interaction.guild.name} (${interaction.guild.id})\n` +

    `🕒 **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`

  );

await Logsystem(interaction.guild, `moderation`, logEmbed);

    } catch (err) {
      console.log(err);

      const embed = new EmbedBuilder()
        .setTitle(`❌ Kick Failed`)
        .setColor(`Red`)
        .setDescription(
          `I couldn't kick this user due to a permission or hierarchy issue.`
        );

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
