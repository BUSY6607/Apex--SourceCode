const { EmbedBuilder, AuditLogEvent } = require(`discord.js`);

const Logsystem = require(`../utils/Logsystem`);

module.exports = {

  name: `voiceStateUpdate`,

  once: false,

  async execute(oldState, newState) {

    try {

      const guild = newState.guild || oldState.guild;

      if (!guild) return;

      const member = newState.member || oldState.member;

      if (!member || member.user.bot) return;

      const oldChannel = oldState.channel;

      const newChannel = newState.channel;

      // No VC change

      if (oldChannel?.id === newChannel?.id) return;

      let embed;

      /* JOIN */

      if (!oldChannel && newChannel) {

        embed = new EmbedBuilder()

          .setColor(`Green`)

          .setTitle(`🔊 Voice channel joined`)

          .setDescription(

            `> **Member:** ${member}\n` +

            `> **Channel:** ${newChannel}`

          )

          .setTimestamp();

      }

      /* LEAVE */

      else if (oldChannel && !newChannel) {

        embed = new EmbedBuilder()

          .setColor(`Red`)

          .setTitle(`🔊 Voice channel left`)

          .setDescription(

            `> **Member:** ${member}\n` +

            `> **Channel:** ${oldChannel}`

          )

          .setTimestamp();

      }

      /* MOVE / DRAG */

      else if (oldChannel && newChannel) {

        let movedBy = `Self / Unknown`;

        try {

          const logs = await guild.fetchAuditLogs({

            type: AuditLogEvent.MemberMove,

            limit: 1

          });

          const entry = logs.entries.first();

          if (

            entry &&

            entry.target?.id === member.id &&

            Date.now() - entry.createdTimestamp < 5000

          ) {

            movedBy = entry.executor ? `${entry.executor}` : movedBy;

          }

        } catch {

          // ignore audit errors

        }

        embed = new EmbedBuilder()

          .setColor(`Blue`)

          .setTitle(`🔊 Voice channel moved`)

          .setDescription(

            `> **Member:** ${member}\n` +

            `> **From:** ${oldChannel}\n` +

            `> **To:** ${newChannel}\n` +

            `> **Moved by:** ${movedBy}`

          )

          .setTimestamp();

      }

      if (!embed) return;

      await Logsystem(guild, `voice`, embed);

    } catch (err) {

      console.log(`voiceStateUpdate log error:`, err);

    }

  }

};

