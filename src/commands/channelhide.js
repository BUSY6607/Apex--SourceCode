const {

    PermissionFlagsBits,

    EmbedBuilder,

    ChannelType,

    ApplicationCommandOptionType

} = require(`discord.js`);

const Logsystem = require(`../utils/Logsystem`);

module.exports = {

    name: `channelhide`,

    description: `Hide or unhide a channel (optional channel selection)`,

    options: [

        {

            name: `action`,

            description: `Hide or unhide the channel`,

            type: ApplicationCommandOptionType.String,

            required: true,

            choices: [

                { name: `Hide`, value: `hide` },

                { name: `Unhide`, value: `unhide` }

            ]

        },

        {

            name: `channel`,

            description: `Select a channel (optional)`,

            type: ApplicationCommandOptionType.Channel,

            required: false,

            channel_types: [

                ChannelType.GuildText,

                ChannelType.GuildVoice

            ]

        }

    ],

    async execute(interaction) {

        /* ================= USER PERMISSION CHECK ================= */

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()

                        .setColor(`Red`)

                        .setDescription(`❌ You need **Manage Channels** permission to use this command.`)

                ],

                ephemeral: true

            });

        }

        /* ================= BOT PERMISSION CHECK ================= */

        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {

            return interaction.reply({

                embeds: [

                    new EmbedBuilder()

                        .setColor(`Red`)

                        .setDescription(`❌ I need **Manage Channels** permission to do this.`)

                ],

                ephemeral: true

            });

        }

        /* ================= ACK ASAP ================= */

        await interaction.deferReply();

        const action = interaction.options.getString(`action`);

        const channel =

            interaction.options.getChannel(`channel`) || interaction.channel;

        /* ================= CHANNEL TYPE CHECK ================= */

        if (![ChannelType.GuildText, ChannelType.GuildVoice].includes(channel.type)) {

            return interaction.editReply({

                embeds: [

                    new EmbedBuilder()

                        .setColor(`Red`)

                        .setDescription(`❌ This channel type is not supported.`)

                ]

            });

        }

        /* ================= STATE CHECK ================= */

        const everyoneOverwrite =

            channel.permissionOverwrites.cache.get(interaction.guild.id);

        const isHidden =

            everyoneOverwrite?.deny.has(PermissionFlagsBits.ViewChannel);

        if (action === `hide` && isHidden) {

            return interaction.editReply({

                embeds: [

                    new EmbedBuilder()

                        .setColor(`Red`)

                        .setDescription(`⚠️ ${channel} is already **hidden**.`)

                ]

            });

        }

        if (action === `unhide` && !isHidden) {

            return interaction.editReply({

                embeds: [

                    new EmbedBuilder()

                        .setColor(`Red`)

                        .setDescription(`⚠️ ${channel} is already **visible**.`)

                ]

            });

        }

        /* ================= PERMISSION UPDATE (OPTIMIZED) ================= */

        try {

            if (action === `hide`) {

                // hide for everyone

                await channel.permissionOverwrites.edit(interaction.guild.id, {

                    ViewChannel: false

                });

                // allow staff / ManageChannels roles

                const staffRoles = interaction.guild.roles.cache.filter(role =>

                    role.permissions.has(PermissionFlagsBits.ManageChannels)

                );

                for (const role of staffRoles.values()) {

                    await channel.permissionOverwrites.edit(role.id, {

                        ViewChannel: true

                    });

                }

            } else {

                // unhide -> remove overwrite

                await channel.permissionOverwrites.edit(interaction.guild.id, {

                    ViewChannel: null

                });

            }

        } catch (err) {

            console.error(err);

            return interaction.editReply({

                embeds: [

                    new EmbedBuilder()

                        .setColor(`Red`)

                        .setDescription(`❌ Failed to update channel permissions.`)

                ]

            });

        }

        /* ================= SUCCESS EMBED ================= */

        await interaction.editReply({

            embeds: [

                new EmbedBuilder()

                    .setColor(action === `hide` ? `Red` : `Green`)

                    .setTitle(

                        action === `hide`

                            ? `🔒 ${channel} has been **hidden** for everyone except staff.`

                            : `🔓 ${channel} is now **visible** for everyone.`

                    )

            ]

        });

        /* ================= LOG EMBED ================= */

        const logEmbed = new EmbedBuilder()

            .setColor(`Blue`)

            .setTitle(`Channel ${action === `hide` ? `Hidden` : `Unhidden`}`)

            .setDescription(

                `👮 **Moderator:** ${interaction.user.tag} (${interaction.user.id})\n` +

                `📺 **Channel:** ${channel.name} (${channel.id})\n` +

                `⚙️ **Action:** ${action.toUpperCase()}\n` +

                `🏠 **Server:** ${interaction.guild.name} (${interaction.guild.id})\n` +

                `🕒 **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`

            );

        Logsystem(interaction.guild, `channels`, logEmbed);

    }

};



