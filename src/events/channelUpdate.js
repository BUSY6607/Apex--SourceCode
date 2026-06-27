const { EmbedBuilder, ChannelType } = require(`discord.js`);

const Logsystem = require(`../utils/Logsystem`);

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

  name: `channelUpdate`,

  once: false,

  async execute(oldChannel, newChannel) {

    try {

      if (!newChannel.guild) return;

      const nameChanged = oldChannel.name !== newChannel.name;

      const typeChanged = oldChannel.type !== newChannel.type;

      // Skip noisy updates

      if (!nameChanged && !typeChanged) return;

      let changes = ``;

      if (nameChanged) {

        changes += `> **Name:** ${oldChannel.name} → ${newChannel.name}\n`;

      }

      if (typeChanged) {

        changes += `> **Type:** ${channelTypeName(oldChannel.type)} → ${channelTypeName(newChannel.type)}\n`;

      }

      const embed = new EmbedBuilder()

        .setColor(`Blue`)

        .setTitle(`✏️ Channel updated`)

        .setDescription(

          `> **Channel:** ${newChannel}\n` +

          changes.trim()

        )

        .setTimestamp();

      await Logsystem(newChannel.guild, `channels`, embed);

    } catch (err) {

      console.log(`channelUpdate log error:`, err);

    }

  }

};

