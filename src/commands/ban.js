const {
    ApplicationCommandOptionType,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");
const logsystem = require(`../utils/Logsystem`)

module.exports = {
    name: "ban",
    description: "Bans a member",

    options: [
        {
            name: "target-user",
            description: "User you want to ban",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "reason",
            description: "Reason for banning",
            type: ApplicationCommandOptionType.String,
            required: false,
        }
    ],

    permissionsRequired: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],

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

        const targetUser = interaction.options.getUser("target-user");
        const reason = interaction.options.getString("reason") || "No reason provided";

        let targetMember;
        try {
            targetMember = await interaction.guild.members.fetch(targetUser.id);
        } catch {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("❌ User not found")
                .setDescription("That user is not in this server.");

            return interaction.editReply({ embeds: [embed] });
        }

        // Owner check
        if (targetMember.id === interaction.guild.ownerId) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("❌ Action denied")
                .setDescription("You cannot ban the server owner.");

            return interaction.editReply({ embeds: [embed] });
        }

        // Role hierarchy checks
        const targetPos = targetMember.roles.highest.position;
        const requesterPos = interaction.member.roles.highest.position;
        const botPos = interaction.guild.members.me.roles.highest.position;

        if (targetPos >= requesterPos) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("❌ Action denied")
                .setDescription("You cannot ban a user with the same or higher role than you.");

            return interaction.editReply({ embeds: [embed] });
        }

        if (targetPos >= botPos) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("❌ Action denied")
                .setDescription("I cannot ban this user because their role is higher than mine.");

            return interaction.editReply({ embeds: [embed] });
        }

        try {
            await targetMember.ban({ reason });

            const successEmbed = new EmbedBuilder()
   .setColor(`Red`) .setTitle(`🚫 ${targetUser.tag} banned`) 

            await interaction.editReply({ embeds: [successEmbed] });
  const logEmbed = new EmbedBuilder()

  .setColor(`Red`)

  .setTitle(`Member Banned`)

  .setDescription(

    `👤 **User:** ${targetUser.tag} (${targetUser.id})\n` +

    `👮 **Moderator:** ${interaction.user.tag} (${interaction.user.id})\n` +

    `📄 **Reason:** ${reason}\n` +

    `🏠 **Server:** ${interaction.guild.name} (${interaction.guild.id})\n` +

    `🕒 **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`

  );

await logsystem(interaction.guild, `moderation`, logEmbed);
            
        } catch (err) {
            console.error(err);

            const failEmbed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("❌ Ban failed")
                .setDescription("I couldn't ban this user due to a permissions or hierarchy issue.");

            await interaction.editReply({ embeds: [failEmbed] });
        }
    }
};
