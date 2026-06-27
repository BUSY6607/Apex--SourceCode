const {
    ApplicationCommandOptionType,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");
const ms = require("ms");
const prettyMs = require("pretty-ms").default;
const Logsystem = require(`../utils/Logsystem`);

module.exports = {
    name: "mute",
    description: "Mutes (timeouts) a member",

    options: [
        {
            name: "target-user",
            description: "User you want to mute",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "duration",
            description: "Mute duration (10m, 1h, 1d)",
            type: ApplicationCommandOptionType.String,
            required: true,
        },
        {
            name: "reason",
            description: "Reason for muting",
            type: ApplicationCommandOptionType.String,
            required: false,
        }
    ],

    async execute(interaction, saim) {

        if (

  !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)

) {

  const fe7 = new EmbedBuilder()

    .setTitle(`❌ Permission Denied`)

    .setColor(`Red`)

    .setDescription(`You need **Mute members** permission to use this command.`);

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
        const duration = interaction.options.getString("duration");
        const reason = interaction.options.getString("reason") || "No reason provided";

        let targetMember;
        try {
            targetMember = await interaction.guild.members.fetch(targetUser.id);
        } catch {
            const embed = new EmbedBuilder()
                .setColor("#ED4245")
                .setTitle("❌ User Not Muted")
                .setDescription("User not found in this server.");

            return interaction.editReply({ embeds: [embed] });
        }

        const failEmbed = new EmbedBuilder()
            .setColor("#ED4245")
            .setTitle("❌ User Not Muted");

        /* ---------- BASIC CHECKS ---------- */

        if (targetMember.user.bot) {
            return interaction.editReply({
                embeds: [failEmbed.setDescription("Bots cannot be muted.")]
            });
        }

        if (targetMember.id === interaction.guild.ownerId) {
            return interaction.editReply({
                embeds: [failEmbed.setDescription("Server owner cannot be muted.")]
            });
        }

        /* ---------- ADMIN CHECK ---------- */

        if (targetMember.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply({
                embeds: [failEmbed.setDescription("You cannot mute an **Administrator**.")]
            });
        }

        /* ---------- DURATION ---------- */

        const msDuration = ms(duration);
        if (!msDuration || msDuration < 5000 || msDuration > 2.419e9) {
            return interaction.editReply({
                embeds: [
                    failEmbed.setDescription(
                        "Invalid duration.\nUse between **5 seconds** and **28 days**.\nExample: `10m`, `1h`, `1d`"
                    )
                ]
            });
        }

        /* ---------- ROLE HIERARCHY ---------- */

        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.editReply({
                embeds: [failEmbed.setDescription("You cannot mute someone with the same or higher role than you.")]
            });
        }

        if (targetMember.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.editReply({
                embeds: [failEmbed.setDescription("My role is not high enough to mute this user.")]
            });
        }

        /* ---------- TIMEOUT ---------- */

        try {
            await targetMember.timeout(msDuration, reason);

const se = new EmbedBuilder()
.setColor(`Green`) .setTitle(`✅ ${targetUser.tag} muted`)

            await interaction.editReply({ embeds: [se] });
            const logEmbed = new EmbedBuilder()

  .setColor(`Red`)

  .setTitle(`Member Muted`)

  .setDescription(

    `👤 **Member:** ${targetMember.user.tag} (${targetMember.id})\n` +

    `⏱️ **Duration:** ${prettyMs(msDuration, { verbose: true })}\n` +

    `📄 **Reason:** ${reason}\n` +

    `👮 **Moderator:** ${interaction.user.tag} (${interaction.user.id})\n` +

    `🏠 **Server:** ${interaction.guild.name} (${interaction.guild.id})\n` +

    `🕒 **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`

  );

await Logsystem(interaction.guild, `moderation`, logEmbed);

        } catch (err) {
            console.log(err);
            return interaction.editReply({
                embeds: [
                    failEmbed.setDescription(
                        "Failed to mute user due to Discord permission restrictions."
                    )
                ]
            });
        }
    }
};
