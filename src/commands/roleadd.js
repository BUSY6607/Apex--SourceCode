const { ApplicationCommandOptionType, PermissionFlagsBits, EmbedBuilder } = require(`discord.js`);

const Logsystem = require(`../utils/Logsystem`);

module.exports = {

    name: `roleadd`,

    description: `add a role to a member`,

    permissionsRequired: [PermissionFlagsBits.ManageRoles],

    botPermissions: [PermissionFlagsBits.ManageRoles],

    options: [

        {

            name: `member`,

            description: `member whom u want to add roles`,

            type: ApplicationCommandOptionType.User,

            required: true

        },

        {

            name: `role`,

            description: `the role u want to add`,

            type: ApplicationCommandOptionType.Role,

            required: true

        },

        {

            name: `reason`,

            description: `the reason for adding role`,

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
      `I need **Manage Roles** permission to run this command.`
    );

  return interaction.reply({ embeds: [fe8], ephemeral: true });
}
        
        const member = interaction.options.getMember(`member`);

        const role = interaction.options.getRole(`role`);

        const reason = interaction.options.getString(`reason`) || `No reason provided!`;

        

        if (!member) {

            const failembed = new EmbedBuilder()

            .setTitle(`❌Action failed`) .setColor(`Red`) .setDescription(`Member not found`)

            return interaction.reply({ embeds: [failembed] });

        }; if (member.roles.cache.has(role.id)) {

            const failembed2 = new EmbedBuilder()

            .setTitle(`❌Action failed`) .setColor(`Red`) .setDescription(`Member already has this role!`)

            return interaction.reply({ embeds: [failembed2] });

        }; 

        

        // role hierarchy 

        if (role.position >= interaction.member.roles.highest.position) {

             const failembed3 = new EmbedBuilder()

            .setTitle(`❌Action failed`) .setColor(`Red`) .setDescription(`You can not add a role higher or equal to your role!`)

            return interaction.reply({ embeds: [failembed3] });

        } if (role.position >= interaction.guild.members.me.roles.highest.position) {

             const failembed4 = new EmbedBuilder()

            .setTitle(`❌Action failed`) .setColor(`Red`) .setDescription(`I can not add this role due to role hierarchy!`)

            return interaction.reply({ embeds: [failembed4] });

        }

        

        await member.roles.add(role, reason);

        
const se = new EmbedBuilder()
.setColor(`Green`) .setTitle(`✅ role added`)
     await interaction.reply({ embeds: [se] });
const logEmbed = new EmbedBuilder()

  .setColor(`Green`)

  .setTitle(`Role Added`)

  .setDescription(

    `👤 **Member:** ${member.user.tag} (${member.id})\n` +

    `🏷️ **Role:** ${role.name} (${role.id})\n` +

    `👮 **Moderator:** ${interaction.user.tag} (${interaction.user.id})\n` +

    `📄 **Reason:** ${reason}\n` +

    `🏠 **Server:** ${interaction.guild.name} (${interaction.guild.id})\n` +

    `🕒 **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`

  );

await Logsystem(interaction.guild, `roles`, logEmbed);

    }

}
                      
                     
        
       
   