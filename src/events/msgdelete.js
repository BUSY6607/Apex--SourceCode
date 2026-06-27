const { EmbedBuilder } = require(`discord.js`);
const Logsystem = require(`../utils/Logsystem`);

module.exports = {
    name: `messageDelete`,
    once: false,
    
async execute(message) {
    try{
       if (!message.guild) return;
       if (message.author?.bot) return; 
       const content = message.content && message.content.length > 0 ? message.content : `Content unavailable `;
    const de = new EmbedBuilder()
    .setColor(`Yellow`) .setTitle(`🗑️ Message deleted`)

        .setDescription(

          `> **Author:** ${message.author}\n` +

          `> **Channel:** ${message.channel}\n` +

          `> **Content:** ${content}`

        )

        .setTimestamp();
       await Logsystem(message.guild, `messages`, de);
        
        /* =========================

   TICKET PANEL EMBED CHECK

========================= */

const TicketConfig = require(`../models/TicketConfig`);

const pauseTicketSystem = require(`../utils/pauseTicketSystem`);

const config = await TicketConfig.findOne({ guildId: message.guild.id });

if (!config || config.isPaused) return;

if (message.id === config.panelMessageId) {

  await pauseTicketSystem(

    message.guild,

    config,

    `Ticket panel embed was deleted`

  );

}
    } catch (err) {
       console.log(`messageDelete log error`, err);
    }
}   
};