const {
    ApplicationCommandOptionType,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const Logsystem = require(`../utils/Logsystem`);

module.exports = {
    name: "unban",
    description: "Unban a user using their ID",
    permissionsRequired: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],

    options: [
        {
            name: "user_id",
            description: "ID of the banned user",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: "reason",
            description: "Reason for unbanning",
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],

    async execute(interaction, saim) {
        if (

  !interaction.member.permissions.has(PermissionFlagsBits.BanMembers)

) {

  const fe7 = new EmbedBuilder()

    .setTitle(`❌ Permission Denied`)

    .setColor(`Red`)

    .setDescription(`You need **Ban Members** permission to use this command.`);

  return interaction.reply({ embeds: [fe7], ephemeral: true });

}
        const bot = interaction.guild.members.me;

if (
  !bot.permissions.has(
    PermissionFlagsBits.BanMembers
  )
) {
  const fe8 = new EmbedBuilder()
    .setTitle(`❌ Missing Bot Permission`)
    .setColor(`Red`)
    .setDescription(
      `I need **Ban Members** permission to run this command.`
    );

  return interaction.reply({ embeds: [fe8], ephemeral: true });
}
        
        await interaction.deferReply();

        const userId = interaction.options.getString("user_id");
        const reason =
            interaction.options.getString("reason") || "No reason provided";

        try {
            // Check if user is banned
            const ban = await interaction.guild.bans
                .fetch(userId)
                .catch(() => null);

            if (!ban) {
                const failEmbed = new EmbedBuilder()
                    .setTitle("❌ User Not Unbanned")
                    .setColor("Red")
                    .setDescription(
                        "This user is not banned in this server."
                    );

                return interaction.editReply({ embeds: [failEmbed] });
            }

            // Unban user
            await interaction.guild.members.unban(userId, reason);

            const se = new EmbedBuilder() .setColor(`Green`) 
            .setTitle(`✅ Member Unbanned`)

            await interaction.editReply({ embeds: [se] });

            // Send mod log
            const logEmbed = new EmbedBuilder()

  .setColor(`Green`)

  .setTitle(`Member Unbanned`)

  .setDescription(

    `👤 **User:** ${ban.user.tag} (${ban.user.id})\n` +

    `👮 **Moderator:** ${interaction.user.tag} (${interaction.user.id})\n` +

    `📄 **Reason:** ${reason}\n` +

    `🏠 **Server:** ${interaction.guild.name} (${interaction.guild.id})\n` +

    `🕒 **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`

  );

await Logsystem(interaction.guild, `moderation`, logEmbed);

        } catch (error) {
            console.error(error);

            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ User Not Unbanned")
                .setColor("Red")
                .setDescription(
                    "Failed to unban the user.\n" +
                    "Check my permissions or the provided user ID."
                );

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
