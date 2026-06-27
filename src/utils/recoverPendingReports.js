const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require(`discord.js`);

const Report = require(`../models/Report`);

const ReportConfig = require(`../models/ReportConfig`);

const sleep = ms => new Promise(res => setTimeout(res, ms));

module.exports = async function recoverPendingReports(client) {

  try {

    const pendingReports = await Report.find({ status: `PENDING` });

    if (!pendingReports || pendingReports.length === 0) return;

    for (const report of pendingReports) {

      const guild = client.guilds.cache.get(report.guildId);

      if (!guild) continue;

      const config = await ReportConfig.findOne({ guildId: report.guildId });

      if (!config || !config.enabled || config.paused) continue;

      const reviewChannel = guild.channels.cache.get(config.reviewChannelId);

      if (!reviewChannel) continue;

      const recoveredEmbed = new EmbedBuilder()

        .setColor(`Blue`)

        .setTitle(`🔄 Report Recovered`)

        .setDescription(`🆔 **Report ID:** ${report.reportId}\n\n👤 **Reporter:** <@${report.reporterId}>`)

        .addFields(

          { name: `📄 Report Content`, value: report.reportedContent || `No text provided` },

          { name: `📊 Status`, value: `🕒 Pending`, inline: false }

        )

        .setFooter({ text: `Apex • Report System` });

      const actionRow = new ActionRowBuilder().addComponents(

        new ButtonBuilder().setCustomId(`report_accept_${report.reportId}`).setLabel(`Accept`).setStyle(ButtonStyle.Success),

        new ButtonBuilder().setCustomId(`report_reject_${report.reportId}`).setLabel(`Reject`).setStyle(ButtonStyle.Danger)

      );

      await reviewChannel.send({     content: `<@&${config.reportRoleId}>`, embeds: [recoveredEmbed], components: [actionRow] });

      await sleep(700);

    }

  } catch (err) {

    console.log(`❌ Recovery Error:`, err);

  }

};

