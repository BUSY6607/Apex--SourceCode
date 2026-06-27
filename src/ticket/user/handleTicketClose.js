const { EmbedBuilder } = require('discord.js');

const Ticket = require('../../models/Ticket');

const TicketConfig = require('../../models/TicketConfig');

module.exports = async function handleTicketClose(interaction) {

  const { guild, user, channel } = interaction;

  // Fetch config

  const config = await TicketConfig.findOne({ guildId: guild.id });

  // Permission check (staff only)

  if (!config || !interaction.member.roles.cache.has(config.supportRoleId)) {

    return interaction.reply({

      ephemeral: true,

      embeds: [

        new EmbedBuilder()

          .setColor('Red')

          .setDescription('❌ You are not allowed to close tickets.')

          .setFooter({ text: 'Apex • Ticket System' })

      ]

    });

  }

  // Fetch ticket

  const ticket = await Ticket.findOne({

    guildId: guild.id,

    channelId: channel.id

  });

  if (!ticket) {

    return interaction.reply({

      ephemeral: true,

      embeds: [

        new EmbedBuilder()

          .setColor('Red')

          .setDescription('❌ This channel is not a ticket.')

          .setFooter({ text: 'Apex • Ticket System' })

      ]

    });

  }

  if (ticket.status === 'closed') {

    return interaction.reply({

      ephemeral: true,

      embeds: [

        new EmbedBuilder()

          .setColor('Yellow')

          .setDescription('⚠️ This ticket is already closed.')

          .setFooter({ text: 'Apex • Ticket System' })

      ]

    });

  }

  // Close ticket in DB

  ticket.status = 'closed';

  ticket.closedAt = new Date();

  await ticket.save();

  // transcript generation

  const generateTranscript = require(`./generateTranscript`);

  let transcriptPath = null;

  try {

    transcriptPath = await generateTranscript(channel);

  } catch (err) {

    console.log(`[Apex Transcript Error]`, err);

  }

  // Channel message

  await channel.send({

    embeds: [

      new EmbedBuilder()

        .setColor('Red')

        .setDescription(`🔒 Ticket closed by ${user}`)

        .setFooter({ text: 'Apex • Ticket System' })

    ]

  });

  // Log — fetch with fallback so cache misses don't crash
  try {

    const logChannel = guild.channels.cache.get(config.logChannelId)
      || await guild.channels.fetch(config.logChannelId).catch(() => null);

    if (logChannel) {

      const logEmbed = new EmbedBuilder()

        .setColor(`Red`)

        .setTitle(`🎟️ Ticket Closed`)

        .setDescription(

          `👤 Closed by: ${user}\n` +

          `📌 Ticket: ${channel}`

        )

        .setFooter({ text: `Apex • Ticket Logs` });

      const payload = { embeds: [logEmbed] };

      if (transcriptPath) {

        payload.files = [transcriptPath];

      }

      await logChannel.send(payload).catch(() => {});

      // Clean up transcript file after sending

      if (transcriptPath) {

        setTimeout(() => {

          require(`fs`).unlink(transcriptPath, err => {

            if (err) {

              console.log(`[Apex Transcript Cleanup Error]`, err);

            }

          });

        }, 3000); // 3 sec safety buffer

      }

    }

  } catch (err) {

    console.log(`[Apex Ticket Log Error]`, err.message);

  }

  setTimeout(async () => {

    try {

      await channel.delete(`Ticket closed`);

    } catch (err) {

      console.log(`[Apex Ticket Delete Error]`, err);

    }

  }, 10_000);

  return interaction.reply({

    ephemeral: true,

    content: 'Ticket closed successfully.'

  });

};
