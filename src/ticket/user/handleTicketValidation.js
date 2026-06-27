const Ticket = require(`../../models/Ticket`);

const { PermissionsBitField, ChannelType } = require(`discord.js`);

module.exports = async function handleTicketValidation({

  interaction,

  config,

  category

}) {

  const { guild, user } = interaction;

  const existingTicket = await Ticket.findOne({

    guildId: guild.id,

    userId: user.id,

    status: `open`

  });

  if (existingTicket) {

    return interaction.reply({

      ephemeral: true,

      embeds: [{

        title: `❌ Ticket Already Open`,

        description:

          `You already have an open ticket.\n` +

          `Please close it before creating a new one.`,

        color: `Red`,

        footer: { text: `Apex • Ticket System` }

      }]

    });

  }

  const botMember = guild.members.me;

  const requiredPerms = [

    PermissionsBitField.Flags.ViewChannel,

    PermissionsBitField.Flags.SendMessages,

    PermissionsBitField.Flags.ManageChannels

  ];

  const missingPerms = requiredPerms.filter(

    perm => !botMember.permissions.has(perm)

  );

  if (missingPerms.length > 0) {

    return interaction.reply({

      ephemeral: true,

      embeds: [{

        title: `❌ Missing Permissions`,

        description:

          `I do not have the required permissions to create ticket channels.`,

        color: `Red`,

        footer: { text: `Apex • Ticket System` }

      }]

    });

  }

  const parentCategory = guild.channels.cache.get(

    config.parentCategoryId

  );

  if (

    !parentCategory ||

    parentCategory.type !== ChannelType.GuildCategory

  ) {

    return interaction.reply({

      ephemeral: true,

      embeds: [{

        title: `❌ Ticket Category Missing`,

        description:

          `Ticket parent category was deleted or is invalid.\n` +

          `Please contact an administrator.`,

        color: `Red`,

        footer: { text: `Apex • Ticket System` }

      }]

    });

  }

  return {

    parentCategory

  };

};

