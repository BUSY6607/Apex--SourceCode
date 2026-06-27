const {
    ApplicationCommandOptionType,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");
const Logsystem = require("../utils/Logsystem");

module.exports = {
    name: "roleremove",
    description: "Remove a role from a member",
    permissionsRequired: [PermissionFlagsBits.ManageRoles],
    botPermissions: [PermissionFlagsBits.ManageRoles],

    options: [
        {
            name: "member",
            description: "Member to remove role from",
            type: ApplicationCommandOptionType.User,
            required: true
        },
        {
            name: "role",
            description: "Role to remove",
            type: ApplicationCommandOptionType.Role,
            required: true
        },
        {
            name: "reason",
            description: "Reason for removing role",
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],

    async execute(interaction) {
        if (

  !interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)

) {

  const fe7 = new EmbedBuilder()

    .setTitle(`❌ Permission Denied`)

    .setColor(`Red`)

    .setDescription(`You need **Manage Roles** permission to use this command.`);

  return interaction.reply({ embeds: [fe7], ephemeral: true });

}
        const bot = interaction.guild.members.me;

if (
  !bot.permissions.has(
    PermissionFlagsBits.ManageRoles
  )
) {
  const fe8 = new EmbedBuilder()
    .setTitle(`❌ Missing Bot Permission`)
    .setColor(`Red`)
    .setDescription(
      `I need **Manage Channels** permission to run this command.`
    );

  return interaction.reply({ embeds: [fe8], ephemeral: true });
}
        
        const member = interaction.options.getMember("member");
        const role = interaction.options.getRole("role");
        const reason = interaction.options.getString("reason") || "No reason provided";

        // member not found
        if (!member) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("❌ Action Failed")
                        .setDescription("Member not found.")
                ]
            });
        }

        // owner protection
        if (member.id === interaction.guild.ownerId) {
            return interaction.reply({ embeds: [new EmbedBuilder() .setColor(`Red`) .setTitle(`❌ Action Failed`) .setDescription(`You can not modify roles of server owner`)] });
        }
        
        if (!member.roles.cache.has(role.id)) {
            return interaction.reply({ embeds: [new EmbedBuilder() .setColor(`Red`) .setTitle(`❌ Action Failed`) .setDescription(`Member does not have this role!`)] });
        }
        
        if (role.id === interaction.guild.id) {
            return interaction.reply({ embeds: [new EmbedBuilder() .setColor(`Red`) .setTitle(`❌ Action Failed`) .setDescription(`You can not remove @ everyone role!`)] });
        }
    
    if (role.position >= interaction.member.roles.highest.position) {
        return interaction.reply({ embeds: [new EmbedBuilder() .setColor(`Red`) .setTitle(`❌ Action Failed`) .setDescription(`You can not remove a role higher or equal to your role!`)] });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ embeds: [new EmbedBuilder() .setColor(`Red`) .setTitle(`❌ Action Failed`) .setDescription(`I can not remove this role due to role hierarchy!`)] });
    }

    await member.roles.remove(role, reason);

    const se = new EmbedBuilder()
   .setColor(`Green`) .setTitle(`✅ role removed`)

    await interaction.reply({ embeds: [se] });
        
        const logEmbed = new EmbedBuilder()

  .setColor(`Orange`)

  .setTitle(`Role Removed`)

  .setDescription(

    `👤 **Member:** ${member.user.tag} (${member.id})\n` +

    `🏷️ **Role:** ${role.name} (${role.id})\n` +

    `👮 **Moderator:** ${interaction.user.tag} (${interaction.user.id})\n` +

    `📄 **Reason:** ${reason}\n` +

    `🏠 **Server:** ${interaction.guild.name} (${interaction.guild.id})\n` +

    `🕒 **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`

  );

await Logsystem(interaction.guild, `roles`, logEmbed);
}};