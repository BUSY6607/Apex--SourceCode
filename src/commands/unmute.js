const {
    ApplicationCommandOptionType,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");
const Logsystem = require(`../utils/Logsystem`);

module.exports = {
    name: "unmute",
    description: "Remove timeout from a member",

    permissionsRequired: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],

    options: [
        {
            name: "target-user",
            description: "User you want to unmute",
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: "reason",
            description: "Reason for unmute",
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],

    async execute(interaction, client) {
        if (

  !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)

) {

  const fe7 = new EmbedBuilder()

    .setTitle(`❌ Permission Denied`)

    .setColor(`Red`)

    .setDescription(`You need **Mute Members** permission to use this command.`);

  return interaction.reply({ embeds: [fe7], ephemeral: true });

}
        
        const bot = interaction.guild.members.me;

if (
  !bot.permissions.has(
    PermissionFlagsBits.ModerateMembers
  )
) {
  const fe8 = new EmbedBuilder()
    .setTitle(`❌ Missing Bot Permission`)
    .setColor(`Red`)
    .setDescription(
      `I need **Mute Members** permission to run this command.`
    );

  return interaction.reply({ embeds: [fe8], ephemeral: true });
}
        
        await interaction.deferReply();

        const targetUser = interaction.options.getUser("target-user");
        const reason = interaction.options.getString("reason") || "No reason provided";

        let targetMember;
        try {
            targetMember = await interaction.guild.members.fetch(targetUser.id);
        } catch {
            const embed = new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ User Not Found")
                .setDescription("The specified user is not in this server.");

            return interaction.editReply({ embeds: [embed] });
        }

        const failEmbed = new EmbedBuilder()
            .setColor("#ED4245")
            .setTitle("❌ User Not Unmuted");

        /* ---------- BASIC CHECKS ---------- */

        if (targetMember.user.bot) {
            return interaction.editReply({
                embeds: [failEmbed.setDescription("Bots cannot be unmuted.")]
            });
        }

        if (targetMember.id === interaction.guild.ownerId) {
            return interaction.editReply({
                embeds: [failEmbed.setDescription("Server owner cannot be unmuted.")]
            });
        }

        /* ---------- CHECK IF MUTED ---------- */

        if (!targetMember.communicationDisabledUntil) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#FAA61A")
                        .setTitle(`🔊 ${targetUser.tag} not muted`)
                        .setDescription("This user is not currently muted.")
                ]
            });
        }

        /* ---------- ROLE HIERARCHY ---------- */

        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.editReply({
                embeds: [failEmbed.setDescription("You cannot unmute someone with the same or higher role than you.")]
            });
        }

        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.editReply({
                embeds: [failEmbed.setDescription("My role is not high enough to unmute this user.")]
            });
        }

        /* ---------- UNTIMEOUT ---------- */

        try {
            await targetMember.timeout(null, reason);

            const se = new EmbedBuilder()
            .setColor(`Green`) .setTitle(`✅ ${targetUser.tag} unmuted `)

            await interaction.editReply({ embeds: [se] });
            const logEmbed = new EmbedBuilder()

  .setColor(`Green`)

  .setTitle(`Member Unmuted`)

  .setDescription(

    `👤 **Member:** ${targetMember.user.tag} (${targetMember.id})\n` +

    `📄 **Reason:** ${reason}\n` +

    `👮 **Moderator:** ${interaction.user.tag} (${interaction.user.id})\n` +

    `🏠 **Server:** ${interaction.guild.name} (${interaction.guild.id})\n` +

    `🕒 **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`

  );

await Logsystem(interaction.guild, `moderation`, logEmbed);

        } catch (err) {
            console.error(err);
            return interaction.editReply({
                embeds: [
                    failEmbed.setDescription(
                        "I couldn't remove the mute due to Discord permission restrictions."
                    )
                ]
            });
        }
    }
};
