const { EmbedBuilder, ChannelType, AuditLogEvent } = require(`discord.js`);

const Logsystem = require(`../utils/Logsystem`);

const ReportConfig = require(`../models/ReportConfig`);

const pauseReportSystem = require(`../utils/pauseReportSystem`);

// Anti-Raid hook
const { detectAndRespond } = require(`../utils/antiRaidEngine`);

function channelTypeName(type) {

  const map = {

    [ChannelType.GuildText]: `Text`,

    [ChannelType.GuildVoice]: `Voice`,

    [ChannelType.GuildCategory]: `Category`,

    [ChannelType.GuildAnnouncement]: `Announcement`,

    [ChannelType.GuildForum]: `Forum`,

    [ChannelType.GuildStageVoice]: `Stage`,

  };

  return map[type] || `Unknown`;

}

module.exports = {

  name: `channelDelete`,

  once: false,

  async execute(channel) {

    try {

      if (!channel.guild) return;

      const embed = new EmbedBuilder()

        .setColor(`Red`)

        .setTitle(`🗑️ Channel Deleted`)

        .setDescription(

          `> **Name:** ${channel.name}\n` +

          `> **Type:** ${channelTypeName(channel.type)}`

        )

        .setTimestamp();

      await Logsystem(channel.guild, `channels`, embed);

      // ANTI-RAID DETECTION

      detectAndRespond(channel.guild, `channelDelete`, AuditLogEvent.ChannelDelete, channel.id);

      //REPORT SYSTEM AUTO-PAUSE

      const config = await ReportConfig.findOne({ guildId: channel.guild.id });

      if (!config || config.paused) return;

      if (

        channel.id === config.reportChannelId ||

        channel.id === config.reviewChannelId ||

        channel.id === config.logChannelId

      ) {

        await pauseReportSystem(

          channel.client,

          channel.guild.id,

          `A required report channel was deleted (${channel.name})`

        );

      }

   //TICKET SYSTEM AUTO-PAUSE

const TicketConfig = require(`../models/TicketConfig`);

const pauseTicketSystem = require(`../utils/pauseTicketSystem`);

const ticketConfig = await TicketConfig.findOne({ guildId: channel.guild.id });

if (!ticketConfig || ticketConfig.isPaused) return;

if (

  channel.id === ticketConfig.panelChannelId ||

  channel.id === ticketConfig.logChannelId ||

  channel.id === ticketConfig.parentCategoryId

) {

  await pauseTicketSystem(

    channel.guild,

    ticketConfig,

    `Critical ticket channel deleted (${channel.name})`

  );

}

    } 
      
      catch (err) {

      console.log(`channelDelete log error:`, err);

    }

  }

};
