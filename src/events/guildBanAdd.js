const { EmbedBuilder, AuditLogEvent } = require(`discord.js`);
const Logsystem = require(`../utils/Logsystem`);

// ── Anti-Raid hook ─────────────────────────────────────────────────────────────
const { detectAndRespond } = require(`../utils/antiRaidEngine`);

module.exports = {

  name: `guildBanAdd`,

  once: false,

  async execute(ban) {

    try {

      const guild = ban.guild;
      if (!guild) return;

      const user = ban.user;

      /* =========================
         LOG SYSTEM
      ========================= */
      const embed = new EmbedBuilder()
        .setColor(`Red`)
        .setTitle(`🔨 Member Banned`)
        .setDescription(
          `> **User:** ${user.tag}\n` +
          `> **ID:** \`${user.id}\``
        )
        .setTimestamp();

      await Logsystem(guild, `members`, embed);

      /* =========================
         ANTI-RAID DETECTION
      ========================= */
      detectAndRespond(guild, `banAdd`, AuditLogEvent.MemberBanAdd, user.id);

    } catch (err) {
      console.log(`guildBanAdd log error:`, err);
    }
  }
};
