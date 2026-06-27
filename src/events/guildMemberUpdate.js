const { EmbedBuilder } = require(`discord.js`);
const Logsystem       = require(`../utils/Logsystem`);
const RolesConnection = require(`../models/RolesConnection`);
const { applyToMember } = require(`../utils/applyConditions`);

module.exports = {
  name: `guildMemberUpdate`,
  once: false,

  async execute(oldMember, newMember) {
    try {
      if (!newMember.guild) return;

      // ROLES CONNECTION — realtime enforcement
      // Only fire when roles actually changed (ignore nickname etc.)

      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;

      // Check if any roles were added or removed
      const rolesChanged =
        oldRoles.size !== newRoles.size ||
        [...newRoles.keys()].some(id => !oldRoles.has(id)) ||
        [...oldRoles.keys()].some(id => !newRoles.has(id));

      if (rolesChanged) {
        const doc = await RolesConnection.findOne({ guildId: newMember.guild.id });

        if (doc && doc.conditions.length > 0) {
          const botHighest = newMember.guild.members.me.roles.highest.position;

          // Re-fetch member to get most current role state before applying
          const freshMember = await newMember.guild.members.fetch(newMember.id).catch(() => newMember);

          await applyToMember(freshMember, doc.conditions, botHighest, false);
        }
      }

      if (oldMember.nickname !== newMember.nickname) {
        const oldNick = oldMember.nickname || `None`;
        const newNick = newMember.nickname || `None`;

        const loge = new EmbedBuilder()
          .setColor(`Blue`)
          .setTitle(`✏️ Nickname updated`)
          .setDescription(
            `> **Member:** ${newMember}\n` +
            `> **Old:** ${oldNick}\n` +
            `> **New:** ${newNick}`
          )
          .setTimestamp();

        await Logsystem(newMember.guild, `members`, loge);
      }

    } catch (err) {
      console.log(`error in guildMemberUpdate`, err);
    }
  }
};
