const { EmbedBuilder, ChannelType, AuditLogEvent } = require(`discord.js`);

const Logsystem = require(`../utils/Logsystem`);

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

  name: `channelCreate`,

  once: false,

  async execute(channel) {

    try {

      if (!channel.guild) return;

      const embed = new EmbedBuilder()

        .setColor(`Green`)

        .setTitle(`📺 Channel created`)

        .setDescription(

          `> **Channel:** ${channel}\n` +

          `> **Name:** ${channel.name}\n` +

          `> **Type:** ${channelTypeName(channel.type)}`

        )

        .setTimestamp();

      await Logsystem(channel.guild, `channels`, embed);

      // ANTI-RAID DETECTION

      detectAndRespond(channel.guild, `channelCreate`, AuditLogEvent.ChannelCreate, channel.id);

    } catch (err) {

      console.log(`channelCreate log error:`, err);

    }

  }

};
