const ChatReactivity = require('../models/ChatReactivity');

// If the gap since the last message exceeds this, the "burst counter" resets.
// This prevents someone counting toward the threshold across two unrelated bursts hours apart.
const BURST_RESET_GAP_MS = 5 * 60 * 1000; // 5 minutes

module.exports = async function trackChannelActivity(message) {
  try {
    if (!message.guild || message.author.bot) return;

    const doc = await ChatReactivity.findOne({ guildId: message.guild.id });
    if (!doc || doc.monitors.length === 0) return;

    const monitor = doc.monitors.find(m => m.channelId === message.channel.id && m.enabled);
    if (!monitor) return;

    const now = Date.now();
    const gapSinceLast = now - new Date(monitor.lastMessageAt).getTime();

    // Reset burst counter if there was a long quiet gap before this message
    if (gapSinceLast > BURST_RESET_GAP_MS) {
      monitor.recentMessageCount = 0;
    }

    monitor.recentMessageCount += 1;
    monitor.lastMessageAt = new Date();

    // Only count as "real" activity once threshold is met
    if (monitor.recentMessageCount >= monitor.minMessageThreshold) {
      // Clear ping-fired flag so 'once' mode can ping again on next inactivity period
      monitor.pingFiredSinceActivity = false;
    }

    await doc.save();

  } catch (err) {
    console.error('[ChatReactivity] trackChannelActivity error:', err);
  }
};
