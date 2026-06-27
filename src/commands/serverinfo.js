const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: "serverinfo",
    description: "shows info of the server",

    async execute(interaction, saim) {
        const guild = interaction.guild;
        const owner = await guild.fetchOwner();

        const embed = new EmbedBuilder()
            .setTitle(`${guild.name} - Server info`)
            .setColor("#22C55E")
            .setThumbnail(guild.iconURL({ size: 1024 }))
            .addFields(
                {
                    name: "Server Name",
                    value: guild.name,
                    inline: true
                },
                {
                    name: "Owner",
                    value: `<@${owner.id}>`,
                    inline: true
                },
                {
                    name: "Members",
                    value: `${guild.memberCount}`,
                    inline: true
                },
                {
                    name: "Server Created",
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
                    inline: true
                },
                {
                    name: "Boost Level",
                    value: `${guild.premiumTier}`,
                    inline: true
                },
                {
                    name: "Boost Count",
                    value: `${guild.premiumSubscriptionCount || 0}`,
                    inline: true
                },
                {
                    name: "Total Roles",
                    value: `${guild.roles.cache.size}`,
                    inline: true
                },
                {
                    name: "Total Channels",
                    value: `${guild.channels.cache.size}`,
                    inline: true
                }
            )
            .setFooter({ text: `Server ID: ${guild.id}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
