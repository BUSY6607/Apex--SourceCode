const { EmbedBuilder } = require(`discord.js`);
const Logsystem = require(`../utils/Logsystem`);

module.exports = {
    name: `guildMemberAdd`,
    once: false,
   async execute(member) {
       try {
           if (!member.guild) return;
           const ma = new EmbedBuilder()

        .setColor(`Green`)

        .setTitle(`👋 Member joined`)

        .setDescription(

          `> **Member:** ${member}\n` +

          `> **Account created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`

        )

        .setTimestamp();
          await Logsystem(member.guild, `members`, ma);
       } catch (err) {
           console.log(`guildMemberAdd log error`, err);
       }
   }
};