const {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
} = require(`discord.js`);

const ReportConfig = require(`../models/ReportConfig`);

module.exports = {
  name: `reports`,
  description: `Configure the Apex report system`,
  permissionsRequired: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageGuild],

  options: [
    {
      name: `enable`,
      description: `Enable and set up the report system`,
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: `report_channel`,
          description: `Channel where users submit reports`,
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText],
          required: true
        },
        {
          name: `review_channel`,
          description: `Channel where staff review reports`,
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText],
          required: true
        },
        {
          name: `log_channel`,
          description: `Channel where report logs are sent`,
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText],
          required: true
        },
        {
          name: `report_role`,
          description: `Staff role allowed to review reports`,
          type: ApplicationCommandOptionType.Role,
          required: true
        }
      ]
    },
    {
      name: `disable`,
      description: `Disable the report system`,
      type: ApplicationCommandOptionType.Subcommand
    },
    {
      name: `restorecomponents`,
      description: `Restore missing report system components`,
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: `report_channel`,
          description: `Restore the report submission channel`,
          type: ApplicationCommandOptionType.Channel,
          required: false
        },
        {
          name: `review_channel`,
          description: `Restore the staff review channel`,
          type: ApplicationCommandOptionType.Channel,
          required: false
        },
        {
          name: `log_channel`,
          description: `Restore the reports log channel`,
          type: ApplicationCommandOptionType.Channel,
          required: false
        },
        {
          name: `report_role`,
          description: `Restore the report staff role`,
          type: ApplicationCommandOptionType.Role,
          required: false
        }
      ]
    }
  ],

  async execute(interaction) {

    /* =====================
       USER PERMISSION CHECK
    ===================== */
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setColor(`Red`)
        .setTitle(`❌ Permission Denied`)
        .setDescription(`You must have **Administrator** permission to use this command.`)
        .setFooter({ text: `Apex • Security Check` });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    /* =====================
       BOT PERMISSION CHECK
    ===================== */
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const embed = new EmbedBuilder()
        .setColor(`Red`)
        .setTitle(`❌ Missing Bot Permission`)
        .setDescription(`I need **Manage Server** permission to manage the report system.`)
        .setFooter({ text: `Apex • Security Check` });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    /* =====================
       ENABLE
    ===================== */
    if (sub === `enable`) {

      const existing = await ReportConfig.findOne({ guildId: interaction.guild.id });

      if (existing && existing.enabled && !existing.paused) {
        const embed = new EmbedBuilder()
          .setColor(`Yellow`)
          .setTitle(`⚠️ Already Enabled`)
          .setDescription(`The report system is already enabled on this server.`)
          .setFooter({ text: `Apex • Report System` });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const reportChannel = interaction.options.getChannel(`report_channel`);
      const reviewChannel = interaction.options.getChannel(`review_channel`);
      const logChannel = interaction.options.getChannel(`log_channel`);
      const reportRole = interaction.options.getRole(`report_role`);

      const config = existing || new ReportConfig({ guildId: interaction.guild.id });

      config.reportChannelId = reportChannel.id;
      config.reviewChannelId = reviewChannel.id;
      config.logChannelId = logChannel.id;
      config.reportRoleId = reportRole.id;
      config.enabled = true;
      config.paused = false;
      config.pausedReason = null;
      config.setupByUserId = interaction.user.id;
      config.setupByIsOwnerAtTime = interaction.user.id === interaction.guild.ownerId;

      await config.save();

      /* ===== GUIDE EMBED ===== */
      const guideEmbed = new EmbedBuilder()
        .setColor(`Blue`)
        .setTitle(`📝 Report a User`)
        .setDescription(
`Send your report in this channel.

• Your message will be automatically deleted
• The report will be sent privately to staff members
• You may attach screenshots, videos, or links as evidence

When you're done typing your report, type your last message as **"done"**
to let the staff know you have finished your report.

⚠️ Using this feature for fun or fake reports
may lead to punishment.`
        )
        .setImage(`https://cdn.discordapp.com/attachments/1388783577382129749/1455197265663889643/649980b19dc6ed28e3fa6da5_6116ba8e117cd6d1e5b849f6_0_nZQIpXVa9dfggQ12.png`)
        .setFooter({ text: `Apex • Report System` });

      let guideSent = true;
      let guideError = null;

      try {
        await reportChannel.send({ embeds: [guideEmbed] });
      } catch (err) {
        guideSent = false;
        guideError = err.message;
        console.log(`Guide embed failed:`, err.message);
      }

      const finalEmbed = new EmbedBuilder()
        .setColor(guideSent ? `Green` : `Yellow`)
        .setTitle(`✅ Report System Enabled`)
        .setDescription(
guideSent
  ? `The report system is now active.\n\n📌 **Guide embed has been successfully sent in** <#${reportChannel.id}>.`
  : `The report system is active, but I **could not send the guide embed** in <#${reportChannel.id}>.\n\n⚠️ Reason:\n\`${guideError}\`\n\nPlease check my permissions (Send Messages, Embed Links).`
        )
        .setFooter({ text: `Apex • Report System` });

      return interaction.reply({ embeds: [finalEmbed] });
    }

    /* =====================
       DISABLE
    ===================== */
    if (sub === `disable`) {

      const config = await ReportConfig.findOne({ guildId: interaction.guild.id });

      if (!config || !config.enabled) {
        const embed = new EmbedBuilder()
          .setColor(`Yellow`)
          .setTitle(`⚠️ Already Disabled`)
          .setDescription(`The report system is already disabled.`)
          .setFooter({ text: `Apex • Report System` });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      config.enabled = false;
      await config.save();

      const embed = new EmbedBuilder()
        .setColor(`Yellow`)
        .setTitle(`🛑 Report System Disabled`)
        .setDescription(`The report system has been disabled successfully.`)
        .setFooter({ text: `Apex • Report System` });

      return interaction.reply({ embeds: [embed] });
    }

    /* =====================
       RESTORE
    ===================== */
    if (sub === `restorecomponents`) {

      const config = await ReportConfig.findOne({ guildId: interaction.guild.id });

      if (!config) {
        const embed = new EmbedBuilder()
          .setColor(`Red`)
          .setTitle(`❌ No Configuration Found`)
          .setDescription(`The report system has not been set up yet.`)
          .setFooter({ text: `Apex • Report System` });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      let updated = false;

      const rCh = interaction.options.getChannel(`report_channel`);
      const rvCh = interaction.options.getChannel(`review_channel`);
      const lCh = interaction.options.getChannel(`log_channel`);
      const rRole = interaction.options.getRole(`report_role`);

      if (rCh) { config.reportChannelId = rCh.id; updated = true; }
      if (rvCh) { config.reviewChannelId = rvCh.id; updated = true; }
      if (lCh) { config.logChannelId = lCh.id; updated = true; }
      if (rRole) { config.reportRoleId = rRole.id; updated = true; }

      if (!updated) {
        const embed = new EmbedBuilder()
          .setColor(`Yellow`)
          .setTitle(`⚠️ Nothing to Restore`)
          .setDescription(`No new components were provided.`)
          .setFooter({ text: `Apex • Report System` });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      config.paused = false;
      config.pausedReason = null;
      config.enabled = true;
      await config.save();

      const embed = new EmbedBuilder()
        .setColor(`Green`)
        .setTitle(`✅ Report System Restored`)
        .setDescription(`The report system has been restored and resumed.`)
        .setFooter({ text: `Apex • Report System` });

      return interaction.reply({ embeds: [embed] });
    }
  }
};
