const { EmbedBuilder } = require(`discord.js`);

const ReportConfig = require(`../models/ReportConfig`);

module.exports = async function pauseReportSystem(client, guildId, reason) {

  const config = await ReportConfig.findOne({ guildId });

  if (!config) return;

  if (config.paused) return; // already paused

  config.paused = true;

  config.pausedReason = reason;

  await config.save();

  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) return;

  // DM priority: setup admin → owner

  let targetUser = null;

  if (config.setupByUserId) {

    targetUser = await client.users.fetch(config.setupByUserId).catch(() => null);

  }

  if (!targetUser) {

    targetUser = await client.users.fetch(guild.ownerId).catch(() => null);

  }

  if (!targetUser) return;

  const embed = new EmbedBuilder()

    .setColor(`Red`)

    .setTitle(`⚠️ Report System Paused`)

    .setDescription(

`The report system has been automatically paused.

🛑 Reason:

${reason}

To fix this, use:

\`/setupreports restorereportscomponents\`

Once fixed, the system will automatically resume.`

    )

    .setFooter({ text: `Apex • Auto Safety System` });

  targetUser.send({ embeds: [embed] }).catch(() => {});

};

