const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require(`discord.js`);

const axios = require(`axios`);

const ReportConfig = require(`../models/ReportConfig`);

module.exports = async function sendReportToReview(client, reportDoc, liveAttachments = []) {

    try {

        const config = await ReportConfig.findOne({ guildId: reportDoc.guildId });

        if (!config || !config.enabled || config.paused) return;

        

        const guild = await client.guilds.fetch(reportDoc.guildId).catch(() => null);

        if (!guild) return;

        

        const reviewChannel = guild.channels.cache.get(config.reviewChannelId);

        if (!reviewChannel) return;

        
        const embed = new EmbedBuilder()

            .setColor(`Yellow`)

            .setTitle(`🚨 New Report Received`)

            .setDescription(`🆔 **Report ID:** ${reportDoc.reportId}\n\n👤 **Reporter:** <@${reportDoc.reporterId}>\n**ID:** ${reportDoc.reporterId}\n\n📄 **Report Content:**\n${reportDoc.reportedContent}`)

            .addFields({ name: `📊 Status`, value: `🕒 Pending`, inline: false })

            .setFooter({ text: `Apex • Report Review` })

            .setTimestamp();
       // Attachment handling (FROM LIVE BUFFER)

const files = [];

for (const att of liveAttachments) {

  if (!att.buffer) continue;

  files.push(

    new AttachmentBuilder(

      att.buffer,

      { name: att.name || `attachment` }

    )

  );

}

        const row = new ActionRowBuilder().addComponents(

            new ButtonBuilder().setCustomId(`report_accept_${reportDoc.reportId}`).setLabel(`Accept`).setStyle(ButtonStyle.Success),

            new ButtonBuilder().setCustomId(`report_reject_${reportDoc.reportId}`).setLabel(`Reject`).setStyle(ButtonStyle.Danger)

        );

        const reviewMessage = await reviewChannel.send({
            
            content: `<@&${config.reportRoleId}>`,
            
            files: files,

            embeds: [embed], 

            components: [row]
        });

        reportDoc.reviewMessageId = reviewMessage.id;

        await reportDoc.save();

    } catch (error) {

        console.error('Error in sendReportToReview:', error);

    }

};

