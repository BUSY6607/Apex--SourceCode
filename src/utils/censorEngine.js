const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const CensorConfig    = require('../models/CensorConfig');
const CensorViolation = require('../models/CensorViolation');
const Warning         = require('../models/Warning');
const Logsystem       = require('./Logsystem');

const FOOTER = { text: 'Apex • Auto-Censor' };

// ── Rolling window for escalation (ms) ────────────────────────────────────────
const WINDOW_MS = 30 * 60 * 1000; // 30 minutes

// ── Leetspeak / homoglyph normalisation map ───────────────────────────────────
const LEET_MAP = {
  '4': 'a', '@': 'a', '8': 'b', '3': 'e', '€': 'e', '6': 'g', '9': 'g',
  '1': 'i', '!': 'i', '|': 'i', '0': 'o', '5': 's', '$': 's', '7': 't',
  '+': 't', '2': 'z'
};

function normalise(text) {
  return text
    // strip zero-width / invisible chars
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    // collapse repeated chars: "heeeeey" → "hey"
    .replace(/(.)\1{2,}/g, '$1$1')
    // leetspeak substitutions
    .split('').map(c => LEET_MAP[c] || c).join('')
    .toLowerCase();
}

// ── Wildcard pattern → regex ──────────────────────────────────────────────────
// Turns "f*ck" into /f.+ck/i
function wildcardToRegex(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.+');
  return new RegExp(escaped, 'i');
}

// ── Test a single word entry against content ──────────────────────────────────
function matchesWord(entry, normalised) {
  if (entry.isRegex) {
    try {
      return new RegExp(entry.pattern, 'i').test(normalised);
    } catch { return false; }
  }
  // Wildcard support
  if (entry.pattern.includes('*')) {
    return wildcardToRegex(entry.pattern).test(normalised);
  }
  // Plain substring match on normalised text
  return normalised.includes(entry.pattern.toLowerCase());
}

// ── Extra filter checks ───────────────────────────────────────────────────────
function checkExtraFilters(config, message) {
  const content = message.content;

  // Invite links
  if (config.filterInviteLinks && /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/\S+/i.test(content)) {
    return { triggered: true, reason: 'Discord invite link' };
  }

  // All links
  if (config.filterAllLinks && /https?:\/\/\S+/i.test(content)) {
    return { triggered: true, reason: 'External link' };
  }

  // Caps filter
  if (config.capsThreshold > 0 && content.length >= 8) {
    const letters = content.replace(/[^a-zA-Z]/g, '');
    if (letters.length > 0) {
      const upper = letters.replace(/[^A-Z]/g, '').length;
      if ((upper / letters.length) * 100 >= config.capsThreshold) {
        return { triggered: true, reason: `Excessive caps (>${config.capsThreshold}%)` };
      }
    }
  }

  // Repeated word spam
  if (config.repeatWordLimit > 0) {
    const words = content.toLowerCase().split(/\s+/).filter(Boolean);
    const freq  = {};
    for (const w of words) freq[w] = (freq[w] || 0) + 1;
    const max = Math.max(...Object.values(freq));
    if (max >= config.repeatWordLimit) {
      return { triggered: true, reason: `Repeated word spam` };
    }
  }

  // Mass mentions
  if (config.massMentionLimit > 0) {
    const mentionCount = (message.mentions.users.size || 0) + (message.mentions.roles.size || 0);
    if (mentionCount >= config.massMentionLimit) {
      return { triggered: true, reason: `Mass mentions (${mentionCount})` };
    }
  }

  return { triggered: false };
}

// ── Get rolling violation count in last WINDOW_MS ─────────────────────────────
function recentViolationCount(doc) {
  if (!doc) return 0;
  const cutoff = Date.now() - WINDOW_MS;
  return doc.violations.filter(v => new Date(v.at).getTime() > cutoff).length;
}

// ── Determine escalation action based on threshold config ─────────────────────
function determineAction(recentCount, thresholds) {
  if (recentCount >= thresholds.ban)     return 'ban';
  if (recentCount >= thresholds.kick)    return 'kick';
  if (recentCount >= thresholds.timeout) return 'timeout';
  if (recentCount >= thresholds.warn)    return 'warn';
  return 'delete';
}

// ── DM the offending user ─────────────────────────────────────────────────────
async function dmUser(user, reason, action) {
  try {
    const actionText = {
      delete:  'Your message was deleted.',
      warn:    'You have been warned.',
      timeout: 'You have been timed out.',
      kick:    'You have been kicked.',
      ban:     'You have been banned.'
    }[action] || 'Action was taken.';

    await user.send({
      embeds: [
        new EmbedBuilder()
          .setColor('Red')
          .setTitle('🚫 Message Removed')
          .addFields(
            { name: '📄 Reason',  value: reason,     inline: false },
            { name: '⚡ Action',  value: actionText, inline: false }
          )
          .setFooter(FOOTER)
          .setTimestamp()
      ]
    });
  } catch { /* DMs closed */ }
}

// ── Send log via existing Logsystem ──────────────────────────────────────────
async function sendLog(guild, message, matchedPattern, action, violationCount) {
  const logEmbed = new EmbedBuilder()
    .setColor('Red')
    .setTitle('🚫 Message Censored')
    .addFields(
      { name: '👤 Member',         value: `${message.author} \`${message.author.tag}\``,     inline: true  },
      { name: '🪪 Member ID',      value: `\`${message.author.id}\``,                        inline: true  },
      { name: '📢 Channel',        value: `${message.channel}`,                              inline: true  },
      { name: '🔍 Matched',        value: `\`${matchedPattern}\``,                           inline: true  },
      { name: '⚡ Action',         value: action.toUpperCase(),                              inline: true  },
      { name: '📊 Violations(30m)',value: `${violationCount}`,                               inline: true  },
      { name: '💬 Message',        value: message.content.slice(0, 200) || '*empty*',        inline: false },
      { name: '⏰ At',             value: `<t:${Math.floor(Date.now() / 1000)}:F>`,          inline: false }
    )
    .setTimestamp()
    .setFooter(FOOTER);

  await Logsystem(guild, 'moderation', logEmbed);
}

// ── Main handler — call this from messageCreate ───────────────────────────────
module.exports = async function handleCensor(message) {
  try {
    if (!message.guild || message.author.bot) return false;

    const config = await CensorConfig.findOne({ guildId: message.guild.id });
    if (!config || !config.enabled) return false;

    const member = message.member;
    if (!member) return false;

    // ── Exemption checks ──────────────────────────────────────────────────
    if (config.exemptChannelIds.includes(message.channel.id)) return false;
    if (config.exemptRoleIds.some(r => member.roles.cache.has(r))) return false;
    // Admins are always exempt
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return false;

    // ── Find a matching word / extra filter ───────────────────────────────
    const normalised = normalise(message.content);
    let matchedPattern = null;
    let severity       = 'low';

    for (const entry of config.words) {
      if (matchesWord(entry, normalised)) {
        matchedPattern = entry.pattern;
        severity       = entry.severity;
        break;
      }
    }

    // If no word matched, check extra filters
    if (!matchedPattern) {
      const extra = checkExtraFilters(config, message);
      if (extra.triggered) {
        matchedPattern = extra.reason;
        severity       = 'low';
      }
    }

    if (!matchedPattern) return false;

    // ── Delete the message first (always) ─────────────────────────────────
    await message.delete().catch(() => {});

    // ── High severity → immediate ban ─────────────────────────────────────
    if (severity === 'high') {
      try {
        await member.ban({ reason: `[Auto-Censor] Severe violation: ${matchedPattern}`, deleteMessageSeconds: 60 });
      } catch { /* missing perms */ }

      await sendLog(message.guild, message, matchedPattern, 'ban', 1);
      if (config.dmOnDelete) await dmUser(message.author, matchedPattern, 'ban');
      return true;
    }

    // ── Escalation logic ──────────────────────────────────────────────────
    let violationDoc = await CensorViolation.findOne({
      guildId: message.guild.id,
      userId:  message.author.id
    });

    const recentCount = recentViolationCount(violationDoc) + 1; // +1 for this violation
    const action      = determineAction(recentCount, config.thresholds);

    // Record violation
    const violationEntry = {
      matchedPattern,
      channelId:      message.channel.id,
      messageSnippet: message.content.slice(0, 100),
      action,
      at:             new Date()
    };

    if (violationDoc) {
      violationDoc.violations.push(violationEntry);
      violationDoc.totalViolations += 1;
      await violationDoc.save();
    } else {
      violationDoc = await CensorViolation.create({
        guildId:         message.guild.id,
        userId:          message.author.id,
        violations:      [violationEntry],
        totalViolations: 1
      });
    }

    // ── Execute escalation action ─────────────────────────────────────────
    if (action === 'warn') {
      const warnId = `WARN-${Date.now().toString(36).toUpperCase()}`;
      await Warning.create({
        guildId:     message.guild.id,
        userId:      message.author.id,
        moderatorId: message.client.user.id,
        reason:      `[Auto-Censor] Matched: ${matchedPattern}`,
        warnId
      });

    } else if (action === 'timeout') {
      const ms = config.timeoutDuration * 60 * 1000;
      try {
        await member.timeout(ms, `[Auto-Censor] ${recentCount} violations in 30 min`);
      } catch { /* missing perms */ }

    } else if (action === 'kick') {
      try {
        await member.kick(`[Auto-Censor] ${recentCount} violations in 30 min`);
      } catch { /* missing perms */ }

    } else if (action === 'ban') {
      try {
        await member.ban({
          reason: `[Auto-Censor] ${recentCount} violations in 30 min`,
          deleteMessageSeconds: 60
        });
      } catch { /* missing perms */ }
    }

    // ── Log & DM ──────────────────────────────────────────────────────────
    await sendLog(message.guild, message, matchedPattern, action, recentCount);
    if (config.dmOnDelete) await dmUser(message.author, matchedPattern, action);

    return true; // message was censored

  } catch (err) {
    console.error('[CensorEngine] Error:', err);
    return false;
  }
};
