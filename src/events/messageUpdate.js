const { EmbedBuilder } = require(`discord.js`);
const Logsystem = require(`../utils/Logsystem`);

module.exports = {
    name: `messageUpdate`,
    once: false,
    
    async execute(oldMessage, newMessage) {
        try {
            if (!newMessage.guild) return;
           if (newMessage.author?.bot) return;
           if (!oldMessage.content && !newMessage.content) return;
           if (oldMessage.content === newMessage.content) return;
            
            const oldContent = oldMessage.content && oldMessage.content.length > 0 ? oldMessage.content: `Content unavailable`;
           const newContent = newMessage.content && newMessage.content.length > 0 ? newMessage.content : `Content unavailable`;
           const ue = new EmbedBuilder()
           .setColor(`Blue`)

        .setTitle(`✏️ Message edited`)

        .setDescription(

          `> **Author:** ${newMessage.author}\n` +

          `> **Channel:** ${newMessage.channel}\n` +

          `> **Old:** ${oldContent}\n` +

          `> **New:** ${newContent}`

        )

        .setTimestamp();
           await Logsystem(newMessage.guild, `messages`, ue);
        } catch (err) {
            console.log(`messageUpdate log error`, err);
        }
    }
};