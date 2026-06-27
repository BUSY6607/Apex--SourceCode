const {
    ApplicationCommandOptionType,
    PermissionFlagsBits,
    EmbedBuilder
} = require(`discord.js`);

const stealHandler = require(`../handlers/stealHandler`);

module.exports = {
    name: `steal`,
    description: `Import an emoji or sticker from an image URL`,

    options: [
        {
            name: `source`,
            description: `Direct image or gif URL`,
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],

    async execute(interaction) {
        if (
            !interaction.member.permissions.has(
                PermissionFlagsBits.ManageGuildExpressions
            )
        ) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(`Red`)
                        .setDescription(
                            `❌ You need **Manage Expressions** permission to use this command.`
                        )
                        .setFooter({
                            text: `Apex • Emoji Stealer`
                        })
                ],
                ephemeral: true
            });
        }

        if (
            !interaction.guild.members.me.permissions.has(
                PermissionFlagsBits.ManageGuildExpressions
            )
        ) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(`Red`)
                        .setDescription(
                            `❌ I need **Manage Expressions** permission.`
                        )
                        .setFooter({
                            text: `Apex • Emoji Stealer`
                        })
                ],
                ephemeral: true
            });
        }

        return stealHandler.start(interaction);
    }
};