const { EmbedBuilder, AuditLogEvent, PermissionsBitField } = require('discord.js');
const AntiRaidConfig = require('../models/AntiRaidConfig');

const FOOTER = { text: 'Apex • Anti-Raid' };

// ── In-memory burst tracker ────────────────────────────────────────────────────
// Key: `${guildId}:${actionType}:${actorId}` → array of timestamps
// This is intentionally in-memory (not DB) because raid detection must be
// microsecond-fast — a DB round trip per action would be too slow during an actual raid.
const burstTracker = new Map();

function recordAction(guildId, actionType, actorId) {
  const key = `${guildId}:${actionType}:${actorId}`;
  const now = Date.now();

  if (!burstTracker.has(key)) burstTracker.set(key, []);
  const timestamps = burstTracker.get(key);

  timestamps.push(now);

  // Trim entries older than 5 minutes — no threshold window will ever exceed this
  const cutoff = now - (5 * 60 * 1000);
  while (timestamps.length && timestamps[0] < cutoff) timestamps.shift();

  return timestamps;
}

function countWithinWindow(timestamps, windowSeconds) {
  const cutoff = Date.now() - (windowSeconds * 1000);
  return timestamps.filter(t => t >= cutoff).length;
}

function genId() {
  return `AR-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

// ── Resolve who performed an action via the audit log ────────────────────────
async function resolveActor(guild, auditLogEventType, targetId = null) {
  try {
    const logs = await guild.fetchAuditLogs({ type: auditLogEventType, limit: 5 });
    const entry = targetId
      ? logs.entries.find(e => e.target?.id === targetId)
      : logs.entries.first();

    // Only trust audit log entries from the last 10 seconds — avoid misattributing
    if (entry && (Date.now() - entry.createdTimestamp) < 10_000) {
      return entry.executor;
    }
  } catch {
    // Missing View Audit Log permission or other failure
  }
  return null;
}

// ── Is this actor exempt from detection? ──────────────────────────────────────
function isExempt(member, config) {
  if (!member) return true; // can't identify actor — fail safe, don't punish unknown
  if (member.id === member.guild.ownerId) return true; // never act against the owner
  if (config.exemptUserIds.includes(member.id)) return true;
  if (member.roles?.cache && config.exemptRoleIds.some(r => member.roles.cache.has(r))) return true;
  return false;
}

// ── Execute the configured response against the actor ────────────────────────
async function executeResponse(guild, actorMember, config) {
  const action = config.responseAction;

  try {
    if (action === 'strip_roles' && actorMember) {
      const rolesToRemove = actorMember.roles.cache.filter(r => r.id !== guild.id);
      await actorMember.roles.remove(rolesToRemove, '[Anti-Raid] Suspicious burst activity detected');
      return 'strip_roles';
    }

    if (action === 'kick' && actorMember) {
      await actorMember.kick('[Anti-Raid] Suspicious burst activity detected');
      return 'kick';
    }

    if (action === 'ban' && actorMember) {
      await actorMember.ban({ reason: '[Anti-Raid] Suspicious burst activity detected', deleteMessageSeconds: 0 });
      return 'ban';
    }
  } catch (err) {
    console.error('[AntiRaid] Failed to execute response:', err.message);
    return 'failed';
  }

  return 'lockdown_only';
}

// ── Lock the server down — strip @everyone send/connect perms ────────────────
async function lockdownGuild(guild, config) {
  try {
    const everyoneRole = guild.roles.everyone;

    // Snapshot current permissions before changing them (so we can restore exactly)
    if (!config.preLockdownPerms) {
      config.preLockdownPerms = everyoneRole.permissions.bitfield.toString();
    }

    const lockedPerms = new PermissionsBitField(everyoneRole.permissions.bitfield)
      .remove([
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.CreatePublicThreads,
        PermissionsBitField.Flags.CreatePrivateThreads,
        PermissionsBitField.Flags.Connect
      ]);

    await everyoneRole.setPermissions(lockedPerms, '[Anti-Raid] Automatic lockdown triggered');

    config.isLockedDown = true;
    config.lockdownExpiresAt = config.lockdownDurationMinutes > 0
      ? new Date(Date.now() + config.lockdownDurationMinutes * 60 * 1000)
      : null;

  } catch (err) {
    console.error('[AntiRaid] Failed to lock down guild:', err.message);
  }
}

// ── Lift lockdown — restore original @everyone permissions ───────────────────
async function liftLockdown(guild, config) {
  try {
    if (config.preLockdownPerms) {
      const everyoneRole = guild.roles.everyone;
      const restoredPerms = new PermissionsBitField(BigInt(config.preLockdownPerms));
      await everyoneRole.setPermissions(restoredPerms, '[Anti-Raid] Lockdown lifted');
    }

    config.isLockedDown = false;
    config.lockdownExpiresAt = null;
    config.preLockdownPerms = null;

  } catch (err) {
    console.error('[AntiRaid] Failed to lift lockdown:', err.message);
  }
}

// ── Send alert embed ──────────────────────────────────────────────────────────
async function sendAlert(guild, config, incident, actorMember) {
  if (!config.alertChannelId) return;

  const channel = guild.channels.cache.get(config.alertChannelId)
    || await guild.channels.fetch(config.alertChannelId).catch(() => null);

  if (!channel) return;

  const actionLabels = {
    channelDelete: '🗑️ Mass Channel Deletion',
    channelCreate: '📺 Mass Channel Creation',
    roleDelete:    '🗑️ Mass Role Deletion',
    roleCreate:    '🏷️ Mass Role Creation',
    banAdd:        '🔨 Mass Ban',
    kickAdd:       '👢 Mass Kick'
  };

  const responseLabels = {
    strip_roles:   '🛡️ Roles stripped from actor',
    kick:          '👢 Actor kicked',
    ban:           '🔨 Actor banned',
    lockdown_only: '🔒 Lockdown only (no action against actor)',
    failed:        '⚠️ Response action failed — manual intervention needed'
  };

  const embed = new EmbedBuilder()
    .setColor('Red')
    .setTitle('🚨 RAID DETECTED')
    .addFields(
      { name: '⚡ Trigger',       value: actionLabels[incident.actionType] || incident.actionType, inline: true },
      { name: '🆔 Incident ID',   value: `\`${incident.id}\``,                                       inline: true },
      { name: '📊 Burst Count',   value: `${incident.count} actions in ${incident.windowSeconds}s`,  inline: true },
      { name: '👤 Actor',         value: actorMember ? `${actorMember} (\`${actorMember.id}\`)` : '*Unknown — could not resolve from audit log*', inline: false },
      { name: '🛡️ Response',      value: responseLabels[incident.responseTaken] || incident.responseTaken, inline: false },
      { name: '🔒 Server Lockdown', value: config.lockdownOnDetect ? '✅ Activated' : '❌ Not configured', inline: false }
    )
    .setFooter(FOOTER)
    .setTimestamp();

  const content = config.alertRoleId ? `<@&${config.alertRoleId}>` : null;

  await channel.send({ content, embeds: [embed] }).catch(() => {});
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT — call this from every monitored event
// ══════════════════════════════════════════════════════════════════════════════
/**
 * @param {Guild}  guild
 * @param {string} actionType   — 'channelDelete' | 'channelCreate' | 'roleDelete' | 'roleCreate' | 'banAdd' | 'kickAdd'
 * @param {string} auditLogEventType — discord.js AuditLogEvent enum value to look up the actor
 * @param {string} targetId     — optional, the ID of the thing acted upon (for matching audit log entries)
 */
async function detectAndRespond(guild, actionType, auditLogEventType, targetId = null) {
  try {
    const config = await AntiRaidConfig.findOne({ guildId: guild.id });
    if (!config || !config.enabled) return;

    const threshold = config.thresholds[actionType];
    if (!threshold) return;

    // Resolve the actor via audit log
    const actorUser = await resolveActor(guild, auditLogEventType, targetId);
    if (!actorUser) return; // can't identify — don't act blindly

    const actorMember = await guild.members.fetch(actorUser.id).catch(() => null);

    // Exempt check — owner, configured users/roles never trigger this
    if (isExempt(actorMember, config)) return;

    // Record this action and check burst count
    const timestamps = recordAction(guild.id, actionType, actorUser.id);
    const count = countWithinWindow(timestamps, threshold.windowSeconds);

    if (count < threshold.count) return; // not over threshold yet

    // ── THRESHOLD EXCEEDED — RAID DETECTED ────────────────────────────────────

    // Clear this actor's tracker so we don't fire repeatedly for the same burst
    burstTracker.delete(`${guild.id}:${actionType}:${actorUser.id}`);

    const responseTaken = await executeResponse(guild, actorMember, config);

    if (config.lockdownOnDetect && !config.isLockedDown) {
      await lockdownGuild(guild, config);
    }

    const incident = {
      id:            genId(),
      actionType,
      actorId:       actorUser.id,
      count,
      windowSeconds: threshold.windowSeconds,
      responseTaken,
      detectedAt:    new Date()
    };

    config.incidents.push(incident);
    if (config.incidents.length > 30) config.incidents.splice(0, config.incidents.length - 30);

    await config.save();

    await sendAlert(guild, config, incident, actorMember);

  } catch (err) {
    console.error('[AntiRaid] detectAndRespond error:', err);
  }
}

module.exports = {
  detectAndRespond,
  lockdownGuild,
  liftLockdown,
  resolveActor
};
