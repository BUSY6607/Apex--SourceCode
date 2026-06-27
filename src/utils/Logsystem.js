const GuildLogConfig = require(`../models/GuildLogConfig`);

module.exports = async (guild, category, embed) => {
    try {
        if (!guild || !category || !embed) return;
        const config = await GuildLogConfig.findOne({ guildId: guild.id });
        if (!config) return;
        if (!config.enabled) return;
        const cat = config.categories?.[category];
        if (!cat || !cat.enabled || !cat.channelId) return;
        const logChannel = guild.channels.cache.get(cat.channelId);
        if (!logChannel) return;
        await logChannel.send({ embeds: [embed] });
    } catch (err) {
        return;
    }
};