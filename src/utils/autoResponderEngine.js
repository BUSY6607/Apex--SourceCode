const { EmbedBuilder } = require('discord.js');
const AutoResponder    = require('../models/AutoResponder');

// ── In-memory cooldown store ──────────────────────────────────────────────────
// Key format:  "global:<guildId>:<triggerId>"  or  "user:<guildId>:<userId>:<triggerId>"
const cooldowns = new Map();

const FOOTER = { text: 'Apex • Auto-Responder' };

// ── Variable injection in response strings ────────────────────────────────────
function injectVars(text, message, fireCount) {
  const guild  = message.guild;
  const author = message.author;
  return text
    .replace(/{user}/gi,       `<@${author.id}>`)
    .replace(/{username}/gi,   author.username)
    .replace(/{server}/gi,     guild.name)
    .replace(/{channel}/gi,    `<#${message.channel.id}>`)
    .replace(/{membercount}/gi, String(guild.memberCount))
    .replace(/{firecount}/gi,  String(fireCount));
}

// ── Check if a trigger matches the message content ───────────────────────────
function matchesTrigger(t, content) {
  const hay    = t.caseSensitive ? content : content.toLowerCase();
  const needle = t.caseSensitive ? t.trigger : t.trigger.toLowerCase();

  switch (t.type) {
    case 'exact':
      return hay === needle;
    case 'contains':
      return hay.includes(needle);
    case 'startswith':
      return hay.startsWith(needle);
    case 'endswith':
      return hay.endsWith(needle);
    case 'regex': {
      try {
        const flags = t.caseSensitive ? '' : 'i';
        return new RegExp(t.trigger, flags).test(content);
      } catch { return false; }
    }
    default:
      return false;
  }
}

// ── Cooldown helpers ──────────────────────────────────────────────────────────
function isOnCooldown(key, seconds) {
  const expires = cooldowns.get(key);
  if (!expires) return false;
  if (Date.now() < expires) return true;
  cooldowns.delete(key);
  return false;
}

function setCooldown(key, seconds) {
  if (seconds > 0) cooldowns.set(key, Date.now() + seconds * 1000);
}

// ── Build a Discord embed from trigger embedData ──────────────────────────────
function buildEmbed(embedData, message, fireCount) {
  const e = new EmbedBuilder().setFooter(FOOTER);

  if (embedData.color)       e.setColor(embedData.color);
  if (embedData.title)       e.setTitle(injectVars(embedData.title, message, fireCount));
  if (embedData.description) e.setDescription(injectVars(embedData.description, message, fireCount));
  if (embedData.footer)      e.setFooter({ text: injectVars(embedData.footer, message, fireCount) });
  if (embedData.imageUrl)    e.setImage(embedData.imageUrl);

  return e;
}

// ── Main handler — call this from messageCreate ───────────────────────────────
module.exports = async function handleAutoResponder(message) {
  try {
    if (!message.guild || message.author.bot) return;

    const config = await AutoResponder.findOne({ guildId: message.guild.id });
    if (!config || !config.enabled || config.triggers.length === 0) return;

    const content = message.content;
    if (!content || content.trim().length === 0) return;

    for (const t of config.triggers) {
      if (!t.enabled) continue;

      // ── Channel scoping ─────────────────────────────────────────────────
      const chId = message.channel.id;
      if (t.blockedChannelIds.length  && t.blockedChannelIds.includes(chId))  continue;
      if (t.allowedChannelIds.length  && !t.allowedChannelIds.includes(chId)) continue;

      // ── Role scoping ────────────────────────────────────────────────────
      const memberRoles = message.member.roles.cache;
      if (t.ignoredRoleIds.length  && t.ignoredRoleIds.some(r  => memberRoles.has(r))) continue;
      if (t.requiredRoleIds.length && !t.requiredRoleIds.some(r => memberRoles.has(r))) continue;

      // ── Pattern match ────────────────────────────────────────────────────
      if (!matchesTrigger(t, content)) continue;

      // ── Cooldown check ───────────────────────────────────────────────────
      const gid = message.guild.id;
      const uid = message.author.id;
      const tid = t.triggerId;

      if (t.globalCooldown > 0) {
        const gKey = `global:${gid}:${tid}`;
        if (isOnCooldown(gKey, t.globalCooldown)) continue;
        setCooldown(gKey, t.globalCooldown);
      }

      if (t.userCooldown > 0) {
        const uKey = `user:${gid}:${uid}:${tid}`;
        if (isOnCooldown(uKey, t.userCooldown)) continue;
        setCooldown(uKey, t.userCooldown);
      }

      // ── Increment fire count ─────────────────────────────────────────────
      await AutoResponder.updateOne(
        { guildId: gid, 'triggers.triggerId': tid },
        { $inc: { 'triggers.$.fireCount': 1 } }
      );
      const newFireCount = t.fireCount + 1;

      // ── Build & send response ────────────────────────────────────────────
      if (t.responseType === 'text') {
        const text = t.responses[0] || '';
        if (!text) continue;
        await message.reply({ content: injectVars(text, message, newFireCount), allowedMentions: { repliedUser: false } });

      } else if (t.responseType === 'random') {
        if (!t.responses.length) continue;
        const pick = t.responses[Math.floor(Math.random() * t.responses.length)];
        await message.reply({ content: injectVars(pick, message, newFireCount), allowedMentions: { repliedUser: false } });

      } else if (t.responseType === 'embed') {
        const embed = buildEmbed(t.embedData, message, newFireCount);
        await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
      }

      // Only fire the first matching trigger per message
      break;
    }
  } catch (err) {
    console.error('[AutoResponder] Error:', err);
  }
};
