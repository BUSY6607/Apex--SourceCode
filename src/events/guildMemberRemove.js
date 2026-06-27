const { EmbedBuilder, AuditLogEvent } = require(`discord.js`);
const Logsystem = require(`../utils/Logsystem`);

// Anti-Raid hook
const { detectAndRespond } = require(`../utils/antiRaidEngine`);

module.exports = {
    name: `guildMemberRemove`,
    once: false,
    
    async execute(member) {
        try {
            if (!member.guild) return;
            const me = new EmbedBuilder()

        .setColor(`Red`)

        .setTitle(`🚪 Member left`)

        .setDescription(

          `> **Member:** ${member.user.tag}\n` +

          `> **User:** ${member.user}`

        )

        .setTimestamp();
            
            await Logsystem(member.guild, `members`, me)

            /* ANTI-RAID DETECTION (only fires if this was actually a KICK, confirmed via audit log inside detectAndRespond voluntary leaves won't match any recent MemberKick audit log entry and will be silently ignored) */
            detectAndRespond(member.guild, `kickAdd`, AuditLogEvent.MemberKick, member.id);

        } catch (err) {
            console.log(`guildMemeberRemove log error`, err);
        }
    }
};
