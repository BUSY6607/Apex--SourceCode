const { EmbedBuilder, AuditLogEvent } = require(`discord.js`);

const Logsystem = require(`../utils/Logsystem`);

// Anti-Raid hook
const { detectAndRespond } = require(`../utils/antiRaidEngine`);

module.exports = {

  name: `roleCreate`,

  once: false,

  async execute(role) {

    try {

      if (!role.guild) return;

      // Optional: skip @everyone

      if (role.id === role.guild.id) return;

      const embed = new EmbedBuilder()

        .setColor(`Green`)

        .setTitle(`🏷️ Role created`)

        .setDescription(

          `> **Role:** ${role}\n` +

          `> **Name:** ${role.name}`

        )

        .setTimestamp();

      await Logsystem(role.guild, `roles`, embed);

      // ANTI- RAID DETECTION 

      detectAndRespond(role.guild, `roleCreate`, AuditLogEvent.RoleCreate, role.id);

    } catch (err) {

      console.log(`roleCreate log error:`, err);

    }

  }

};
