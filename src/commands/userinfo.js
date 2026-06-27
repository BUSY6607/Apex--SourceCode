const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");

module.exports = {
    name: "userinfo",
    description: "shows information about a user",
    options: [
        {
            name: "user",
            description: "select a user",
            type: ApplicationCommandOptionType.User,
            required: false,
        }
    ],

    async execute(interaction, saim) {
        const target = interaction.options.getUser("user") || interaction.user;
        const member = interaction.guild.members.cache.get(target.id);

        const roles = member.roles.cache
            .filter(role => role.id !== interaction.guild.id)
            .map(role => role.toString())
            .join(", ") || "No roles";

        const userinfo_embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle(`${target.username}'s Info`)
            .setThumbnail(target.displayAvatarURL({ size: 1024 }))
            .addFields(
                { name: "Username", value: target.tag, inline: true },
                {
                    name: "Joined Server",
                    value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
                    inline: true
                },
                {
                    name: "Joined Discord",
                    value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`,
                    inline: true
                },
                { name: "Roles", value: roles }
            )
            .setFooter({ text: `UserID: ${target.id}` })
            .setTimestamp();

        await interaction.reply({ embeds: [userinfo_embed] });
    }
};
