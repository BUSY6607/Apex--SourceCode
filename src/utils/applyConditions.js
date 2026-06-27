// ── Shared core engine ────────────────────────────────────────────────────────
// Used by both /roles-connection apply (bulk) and guildMemberUpdate (realtime)

const RolesConnection = require('../models/RolesConnection');

/**
 * Apply all enabled conditions to a single member.
 * Returns { rolesAdded, rolesRemoved, skipped, errors }
 *
 * @param {GuildMember} member
 * @param {Array}       conditions  — pre-loaded conditions array (optional, will fetch if not passed)
 * @param {number}      botHighest  — bot's highest role position
 * @param {boolean}     dryRun      — if true, count but don't actually change anything
 */
async function applyToMember(member, conditions, botHighest, dryRun = false) {
  let rolesAdded = 0, rolesRemoved = 0, skipped = 0, errors = 0;

  for (const condition of conditions) {
    if (!condition.enabled) continue;

    // Member must have the trigger role
    if (!member.roles.cache.has(condition.triggerRoleId)) continue;

    // Hierarchy check
    const targetRole = member.guild.roles.cache.get(condition.targetRoleId);
    if (!targetRole || targetRole.position >= botHighest) {
      skipped++;
      continue;
    }

    try {
      if (condition.action === 'add') {
        if (!member.roles.cache.has(condition.targetRoleId)) {
          if (!dryRun) await member.roles.add(condition.targetRoleId, `[Roles Connection] Trigger: ${condition.triggerRoleId}`);
          rolesAdded++;
        }
      } else if (condition.action === 'remove') {
        if (member.roles.cache.has(condition.targetRoleId)) {
          if (!dryRun) await member.roles.remove(condition.targetRoleId, `[Roles Connection] Trigger: ${condition.triggerRoleId}`);
          rolesRemoved++;
        }
      }
    } catch {
      errors++;
    }
  }

  return { rolesAdded, rolesRemoved, skipped, errors };
}

/**
 * Bulk apply — processes all members with live progress updates.
 * Calls onProgress(processed, total, stats) every 50 members.
 *
 * @param {Guild}    guild
 * @param {Array}    conditions
 * @param {boolean}  botsIncluded
 * @param {boolean}  dryRun
 * @param {Function} onProgress   — async callback for progress updates
 */
async function applyBulk(guild, conditions, botsIncluded, dryRun, onProgress) {
  const botHighest = guild.members.me.roles.highest.position;

  // Fetch ALL members
  const all     = await guild.members.fetch();
  const targets = botsIncluded
    ? [...all.values()]
    : [...all.values()].filter(m => !m.user.bot);

  const total = targets.length;
  let processed = 0;
  let rolesAdded = 0, rolesRemoved = 0, skipped = 0, errors = 0;

  // Process in batches of 10 — smarter than one-at-a-time
  // Each batch: up to 10 members processed, then a single 1s pause
  // This means 10k members = ~1000 batches × 1s = ~17 minutes worst case
  // vs old approach: 10k × conditions × 300ms = could be hours
  const BATCH_SIZE     = 10;
  const BATCH_DELAY_MS = 1000;
  const PROGRESS_EVERY = 50; // update embed every 50 members

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async member => {
      const result = await applyToMember(member, conditions, botHighest, dryRun);
      rolesAdded   += result.rolesAdded;
      rolesRemoved += result.rolesRemoved;
      skipped      += result.skipped;
      errors       += result.errors;
      processed++;
    }));

    // Live progress update every PROGRESS_EVERY members
    if (onProgress && (processed % PROGRESS_EVERY === 0 || processed === total)) {
      await onProgress(processed, total, { rolesAdded, rolesRemoved, skipped, errors }).catch(() => {});
    }

    // Batch delay to respect rate limits
    if (i + BATCH_SIZE < targets.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return { total, rolesAdded, rolesRemoved, skipped, errors };
}

module.exports = { applyToMember, applyBulk };
