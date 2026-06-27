const AntiRaidConfig = require('../models/AntiRaidConfig');
const { liftLockdown } = require('./antiRaidEngine');

const CHECK_INTERVAL_MS = 30 * 1000; // check every 30s — lockdown lift should feel prompt

async function checkLockdownExpiry(client) {
  try {
    const lockedDocs = await AntiRaidConfig.find({ isLockedDown: true, lockdownExpiresAt: { $ne: null } });

    for (const config of lockedDocs) {
      if (new Date(config.lockdownExpiresAt).getTime() > Date.now()) continue;

      const guild = client.guilds.cache.get(config.guildId);
      if (!guild) continue;

      await liftLockdown(guild, config);
      await config.save();

      // Notify in the alert channel that lockdown auto-lifted
      if (config.alertChannelId) {
        const channel = guild.channels.cache.get(config.alertChannelId)
          || await guild.channels.fetch(config.alertChannelId).catch(() => null);

        if (channel) {
          const { EmbedBuilder } = require('discord.js');
          await channel.send({
            embeds: [new EmbedBuilder()
              .setColor('Green')
              .setTitle('🔓 Lockdown Automatically Lifted')
              .setDescription('The scheduled lockdown duration has passed. Server permissions have been restored.')
              .setFooter({ text: 'Apex • Anti-Raid' })
              .setTimestamp()]
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('[AntiRaid] checkLockdownExpiry error:', err);
  }
}

function startAntiRaidChecker(client) {
  console.log('[AntiRaid] Lockdown expiry checker started (interval: 30s)');

  const interval = setInterval(() => checkLockdownExpiry(client), CHECK_INTERVAL_MS);
  if (interval.unref) interval.unref();

  // Run once shortly after boot too
  setTimeout(() => checkLockdownExpiry(client), 15_000);
}

module.exports = { startAntiRaidChecker, checkLockdownExpiry };
