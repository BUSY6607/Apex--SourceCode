const { EmbedBuilder } = require('discord.js');

const Ticket = require('../../models/Ticket');

module.exports = async function handleTicketClaim(interaction) {

  const { guild, user, channel } = interaction;

  // Permission check (support role)

  const config = await require('../../models/TicketConfig')

    .findOne({ guildId: guild.id });

  if (!config || !interaction.member.roles.cache.has(config.supportRoleId)) {

    return interaction.reply({

      ephemeral: true,

      embeds: [

        new EmbedBuilder()

          .setColor('Red')

          .setDescription('❌ You are not allowed to claim tickets.')

          .setFooter({ text: 'Apex • Ticket System' })

      ]

    });

  }

  // Fetch ticket

  const ticket = await Ticket.findOne({

    guildId: guild.id,

    channelId: channel.id,

    status: 'open'

  });

  if (!ticket) {

    return interaction.reply({

      ephemeral: true,

      embeds: [

        new EmbedBuilder()

          .setColor('Red')

          .setDescription('❌ This channel is not an active ticket.')

          .setFooter({ text: 'Apex • Ticket System' })

      ]

    });

  }

  if (ticket.claimedBy) {

    return interaction.reply({

      ephemeral: true,

      embeds: [

        new EmbedBuilder()

          .setColor('Yellow')

          .setDescription(`⚠️ Ticket already claimed by <@${ticket.claimedBy}>`)

          .setFooter({ text: 'Apex • Ticket System' })

      ]

    });

  }

  // Claim ticket

  ticket.claimedBy = user.id;

  await ticket.save();

  // Rename ticket channel to show claimed status

  try {

    if (!channel.name.includes('claimed')) {

      let newName = channel.name;

      // Avoid name length overflow (Discord limit = 100)

      if (newName.length + 10 <= 100) {

        newName = `${newName}-claimed`;

      }

      await channel.setName(newName);

    }

  } catch (err) {

    // silently ignore rename errors (permissions / rate limits)

  }

  // Channel message

  await channel.send({

    embeds: [

      new EmbedBuilder()

        .setColor('Green')

        .setDescription(`✅ Ticket claimed by ${user}`)

        .setFooter({ text: 'Apex • Ticket System' })

    ]

  });

  // Log — fetch with fallback so cache misses don't crash

  try {

    const logChannel = guild.channels.cache.get(config.logChannelId)
      || await guild.channels.fetch(config.logChannelId).catch(() => null);

    if (logChannel) {

      await logChannel.send({

        embeds: [

          new EmbedBuilder()

            .setColor('Blue')

            .setTitle('🎟️ Ticket Claimed')

            .setDescription(

              `👤 Staff: ${user}\n` +

              `📌 Ticket: ${channel}`

            )

            .setFooter({ text: 'Apex • Ticket Logs' })

        ]

      }).catch(() => {});

    }

  } catch (err) {

    console.log(`[Apex Ticket Log Error]`, err.message);

  }

  return interaction.reply({ ephemeral: true, content: 'Ticket claimed.' });

};
