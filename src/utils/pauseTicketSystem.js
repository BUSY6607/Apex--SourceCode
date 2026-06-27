const notifyAdminOrOwner = require(`./notifyAdminOrOwner`);

module.exports = async function pauseTicketSystem(guild, config, reason) {

  // ALWAYS notify (even if already paused)

  await notifyAdminOrOwner(guild, config, reason);

  // Pause only once

  if (config.isPaused) return;

  config.isPaused = true;

  config.pauseReason = reason;

  config.pausedAt = new Date();

  await config.save();

};

