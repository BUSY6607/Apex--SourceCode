const ChatReactivity = require('../models/ChatReactivity');
const { isWithinBusinessHours } = require('./businessHours');

const CHECK_INTERVAL_MS    = 60 * 1000;       // check every 60s
const STARTUP_GRACE_MS     = 5 * 60 * 1000;   // ignore inactivity for 5 min after bot boot
const MAX_PING_LOG_ENTRIES = 30;

function buildPingContent(monitor, channel) {
  const roleMentions = monitor.pingRoleIds.map(id => `<@&${id}>`).join(' ');
  const userMentions  = monitor.pingUserIds.map(id => `<@${id}>`).join(' ');
  const mentions       = [roleMentions, userMentions].filter(Boolean).join(' ');

  if (monitor.customMessage) {
    return monitor.customMessage
      .replace(/{role}/gi, mentions || '*(no one configured)*')
      .replace(/{channel}/gi, `${channel}`);
  }

  return `${mentions} — This channel has been quiet for a while. Anyone around? 👋`;
}

async function checkAllMonitors(client) {
  try {
    const allDocs = await ChatReactivity.find({ 'monitors.0': { $exists: true } });
    const now = Date.now();

    for (const doc of allDocs) {
      const guild = client.guilds.cache.get(doc.guildId);
      if (!guild) continue;

      // ── Restart-safety: skip checks entirely during the grace period ────────
      const sinceBotStart = now - new Date(doc.lastBotStartAt).getTime();
      if (sinceBotStart < STARTUP_GRACE_MS) continue;

      let docChanged = false;

      for (const monitor of doc.monitors) {
        if (!monitor.enabled) continue;

        // ── Snooze check ────────────────────────────────────────────────────
        if (monitor.snoozedUntil && new Date(monitor.snoozedUntil).getTime() > now) {
          continue;
        }
        if (monitor.snoozedUntil && new Date(monitor.snoozedUntil).getTime() <= now) {
          monitor.snoozedUntil = null; // auto-clear expired snooze
          docChanged = true;
        }

        // ── Business hours check ────────────────────────────────────────────
        if (!isWithinBusinessHours(monitor)) continue;

        const lastMsgTime  = new Date(monitor.lastMessageAt).getTime();
        const lastPingTime = monitor.lastPingedAt ? new Date(monitor.lastPingedAt).getTime() : 0;

        const inactivityMs = monitor.inactivityMinutes * 60 * 1000;
        const silentLongEnough = (now - lastMsgTime) >= inactivityMs;

        if (!silentLongEnough) continue;

        // ── Ping mode logic ──────────────────────────────────────────────────
        if (monitor.pingMode === 'once') {
          // Only ping if we haven't already pinged since the last real activity
          if (monitor.pingFiredSinceActivity) continue;
        } else {
          // Repeat mode — respect cooldown between pings
          const cooldownMs = monitor.pingCooldownMinutes * 60 * 1000;
          if ((now - lastPingTime) < cooldownMs) continue;
        }

        // No one configured to ping — skip
        if (monitor.pingRoleIds.length === 0 && monitor.pingUserIds.length === 0) continue;

        const channel = guild.channels.cache.get(monitor.channelId)
          || await guild.channels.fetch(monitor.channelId).catch(() => null);

        if (!channel) continue;

        const botPerms = channel.permissionsFor(guild.members.me);
        if (!botPerms || !botPerms.has('SendMessages') || !botPerms.has('ViewChannel')) continue;

        try {
          await channel.send({ content: buildPingContent(monitor, channel) });

          monitor.lastPingedAt = new Date();
          monitor.pingFiredSinceActivity = true;
          docChanged = true;

          // ── Audit log ───────────────────────────────────────────────────────
          doc.pingLog.push({
            monitorId: monitor.id,
            channelId: monitor.channelId,
            pingedAt:  new Date(),
            silentForMinutes: Math.floor((now - lastMsgTime) / 60000)
          });
          if (doc.pingLog.length > MAX_PING_LOG_ENTRIES) {
            doc.pingLog.splice(0, doc.pingLog.length - MAX_PING_LOG_ENTRIES);
          }

        } catch (err) {
          console.error(`[ChatReactivity] Failed to ping in ${channel.id}:`, err.message);
        }
      }

      if (docChanged) await doc.save();
    }

  } catch (err) {
    console.error('[ChatReactivity] checkAllMonitors error:', err);
  }
}

function startReactivityChecker(client) {
  console.log('[ChatReactivity] Background checker started (interval: 60s, startup grace: 5min)');

  const interval = setInterval(() => checkAllMonitors(client), CHECK_INTERVAL_MS);
  if (interval.unref) interval.unref();

  // Record bot start time for every guild doc so the grace period applies correctly
  ChatReactivity.updateMany({}, { $set: { lastBotStartAt: new Date() } }).catch(err =>
    console.error('[ChatReactivity] Failed to set lastBotStartAt:', err)
  );

  setTimeout(() => checkAllMonitors(client), STARTUP_GRACE_MS + 5000);
}

module.exports = { startReactivityChecker, checkAllMonitors };
