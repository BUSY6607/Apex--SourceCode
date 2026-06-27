const { EmbedBuilder, AuditLogEvent } = require(`discord.js`);

const Logsystem = require(`../utils/Logsystem`);

const ReportConfig = require(`../models/ReportConfig`);

const pauseReportSystem = require(`../utils/pauseReportSystem`);

// Anti-Raid hook
const { detectAndRespond } = require(`../utils/antiRaidEngine`);

module.exports = {

  name: `roleDelete`,

  once: false,

  async execute(role) {

    try {

      if (!role.guild) return;

      // Optional: skip @everyone

      if (role.id === role.guild.id) return;

      const embed = new EmbedBuilder()

        .setColor(`Red`)

        .setTitle(`🗑️ Role Deleted`)

        .setDescription(

          `> **Role:** ${role.name}`

        )

        .setTimestamp();

      await Logsystem(role.guild, `roles`, embed);

      // ANTI-RAID DETECTION

      detectAndRespond(role.guild, `roleDelete`, AuditLogEvent.RoleDelete, role.id);

      // REPORT SYSTEM AUTO-PAUSE

      const config = await ReportConfig.findOne({ guildId: role.guild.id });

      if (!config || config.paused) return;

      if (role.id === config.reportRoleId) {

        await pauseReportSystem(

          role.client,

          role.guild.id,

          `The report staff role was deleted (${role.name})`

        );

      }
        
        // TICKET SYSTEM AUTO-PAUSE

const TicketConfig = require(`../models/TicketConfig`);

const pauseTicketSystem = require(`../utils/pauseTicketSystem`);

const ticketConfig = await TicketConfig.findOne({ guildId: role.guild.id });

if (!ticketConfig || ticketConfig.isPaused) return;

if (role.id === ticketConfig.supportRoleId) {

  await pauseTicketSystem(

    role.guild,

    ticketConfig,

    `Support role was deleted (${role.name})`

  );

}

    } catch (err) {

      console.log(`roleDelete log error:`, err);

    }

  }

};
