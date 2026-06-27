const { EmbedBuilder } = require(`discord.js`);

module.exports = async function notifyAdminOrOwner(guild, config, reason) {

  let user = null;

  if (config.setupBy) {

    user = await guild.client.users.fetch(config.setupBy).catch(() => null);

  }

  if (!user) {

    user = await guild.fetchOwner().then(o => o.user).catch(() => null);

  }

  if (!user) return;

  const embed = new EmbedBuilder()

    .setColor(`Red`)

    .setTitle(`🚨 Ticket System Paused`)

    .setDescription(

      `**Server:** ${guild.name}\n\n` +

      `**Reason:** ${reason}\n\n` +

      `Ticket system auto-paused to prevent errors.\n\n` +

      `Fix using:\n\`/restoreticketcomponents\``

    )

    .setFooter({ text: `Apex • Ticket Safety System` })

    .setTimestamp();

  await user.send({ embeds: [embed] }).catch(() => {});

};

