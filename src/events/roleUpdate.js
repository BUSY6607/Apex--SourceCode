const { EmbedBuilder } = require(`discord.js`);

const Logsystem = require(`../utils/Logsystem`);

module.exports = {

  name: `roleUpdate`,

  once: false,

  async execute(oldRole, newRole) {

    try {

      if (!newRole.guild) return;

      // Optional: skip @everyone

      if (newRole.id === newRole.guild.id) return;

      // Only log meaningful changes (name or color)

      const nameChanged = oldRole.name !== newRole.name;

      const colorChanged = oldRole.color !== newRole.color;

      if (!nameChanged && !colorChanged) return;

      let changes = ``;

      if (nameChanged) {

        changes += `> **Name:** ${oldRole.name} → ${newRole.name}\n`;

      }

      if (colorChanged) {

        changes += `> **Color:** ${oldRole.hexColor} → ${newRole.hexColor}\n`;

      }

      const embed = new EmbedBuilder()

        .setColor(`Blue`)

        .setTitle(`✏️ Role updated`)

        .setDescription(

          `> **Role:** ${newRole}\n` +

          changes.trim()

        )

        .setTimestamp();

      await Logsystem(newRole.guild, `roles`, embed);

    } catch (err) {

      console.log(`roleUpdate log error:`, err);

    }

  }

};

