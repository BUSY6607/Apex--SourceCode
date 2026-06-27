const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
} = require(`discord.js`);

const GuildLogConfig = require(`../models/GuildLogConfig`);

const VALID_CATEGORIES = [
  `moderation`,
  `messages`,
  `roles`,
  `channels`,
  `members`,
  `voice`
];

module.exports = {
  name: `logs`,
  description: `configure server logs`,
  permissionsRequired: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.SendMessages],

  options: [
    {
      name: `enable`,
      description: `enable logs`,
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: `disable`,
      description: `disable logs`,
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: `set`,
      description: `set log channel`,
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: `category`,
          description: `log category`,
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: VALID_CATEGORIES.map(c => ({
            name: c,
            value: c
          }))
        },
        {
          name: `channel`,
          description: `channel for logs`,
          type: ApplicationCommandOptionType.Channel,
          required: true,
          channelTypes: [ChannelType.GuildText]
        }
      ]
    },
    {
      name: `off`,
      description: `disable a log category`,
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: `category`,
          description: `log category`,
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: VALID_CATEGORIES.map(c => ({
            name: c,
            value: c
          }))
        }
      ]
    },
    {
      name: `status`,
      description: `show log configuration status`,
      type: ApplicationCommandOptionType.Subcommand
    }
  ],

  async execute(interaction) {

    // USER PERMISSION CHECK
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(`Red`)
            .setDescription(
              `❌ You need **Administrator** permission to use this command.`
            )
        ],
        ephemeral: true
      });
    }

    // BOT PERMISSION CHECK
    if (
      !interaction.guild.members.me.permissions.has(
        PermissionFlagsBits.ManageGuild
      )
    ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(`Red`)
            .setDescription(
              `❌ I need **Manage Server** permission to run this command.`
            )
        ],
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();

    let config = await GuildLogConfig.findOne({
      guildId: interaction.guild.id
    });

    if (!config) {
      config = await GuildLogConfig.create({
        guildId: interaction.guild.id
      });
    }

    // ENABLE
    if (sub === `enable`) {
      config.enabled = true;
      await config.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(`Green`)
            .setDescription(`✅ **Logs enabled globally**`)
        ]
      });
    }

    // DISABLE
    if (sub === `disable`) {
      config.enabled = false;
      await config.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(`Red`)
            .setDescription(`❌ **Logs disabled globally**`)
        ]
      });
    }

    // SET CATEGORY
    if (sub === `set`) {
      const category = interaction.options.getString(`category`);
      const channel = interaction.options.getChannel(`channel`);

      config.categories[category].enabled = true;
      config.categories[category].channelId = channel.id;
      await config.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(`Blue`)
            .setDescription(
              `📌 **${category} logs enabled**\nChannel: ${channel}`
            )
        ]
      });
    }

    // OFF CATEGORY
    if (sub === `off`) {
      const category = interaction.options.getString(`category`);

      config.categories[category].enabled = false;
      config.categories[category].channelId = null;
      await config.save();

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(`Red`)
            .setDescription(`❌ **${category} logs disabled**`)
        ]
      });
    }

    // STATUS
    if (sub === `status`) {
      const lines = VALID_CATEGORIES.map(cat => {
        const c = config.categories[cat];
        return `**${cat}** → ${
          c.enabled && c.channelId ? `<#${c.channelId}>` : `OFF`
        }`;
      });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(`Blue`)
            .setDescription(
              `🧾 **Log Status**\n\n` +
              `Global: **${config.enabled ? `ON` : `OFF`}**\n\n` +
              lines.join(`\n`)
            )
        ]
      });
    }
  }
};
