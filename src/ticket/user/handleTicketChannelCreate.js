const { ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require(`discord.js`);

const Ticket = require(`../../models/Ticket`);

module.exports = async function handleTicketChannelCreate({

  interaction,

  config,

  category,
    
  ticketId,

  creationMode

}) {
    
    // safe defer (only if not already replied)
if (!interaction.deferred && !interaction.replied) {
  await interaction.deferReply({ ephemeral: true });
}

  const { guild, user } = interaction;

  // Channel name (safe + readable)

  const channelName =

    `ticket-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, ``);
    
    const supportRoleId = config.supportRoleId;

const categoryName = category.label || category.value;

const categoryValue = category.value;

  // Permission overwrites

  const permissionOverwrites = [

    {

      id: guild.roles.everyone,

      deny: [PermissionsBitField.Flags.ViewChannel]

    },

    {

      id: user.id,

      allow: [

        PermissionsBitField.Flags.ViewChannel,

        PermissionsBitField.Flags.SendMessages,

        PermissionsBitField.Flags.ReadMessageHistory

      ]

    },

    {

      id: config.supportRoleId,

      allow: [

        PermissionsBitField.Flags.ViewChannel,

        PermissionsBitField.Flags.SendMessages,

        PermissionsBitField.Flags.ReadMessageHistory

      ]

    }

  ];

  // Create channel

  const channel = await guild.channels.create({

    name: channelName,

    type: ChannelType.GuildText,

    parent: config.parentCategoryId,

    permissionOverwrites

  });
    
    await Ticket.create({

  guildId: guild.id,

  userId: user.id,

  channelId: channel.id,

  categoryValue,

  claimedBy: null,

  status: 'open',

  createdAt: new Date(),

  closedAt: null

});
    
    // channel embed send plus pin
    
    const supportRole = guild.roles.cache.get(supportRoleId);

const embed = new EmbedBuilder()

  .setColor('Blue')

  .setDescription(

    `🎟️ Ticket Channel Created\n` +

    `👤 User: ${user}\n` +

    `📂 Category: ${categoryName}\n` +

    `🕒 Created: <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +

    `📌 Status: **OPEN**\n\n` +

    `Please describe your issue clearly.\n` +

    `Our staff will assist you shortly.`

  )

  .setFooter({ text: 'Apex • Ticket System' });
    
    const claimRow = new ActionRowBuilder().addComponents(

  new ButtonBuilder()

    .setCustomId('ticket:claim')

    .setLabel('Claim Ticket')

    .setStyle(ButtonStyle.Primary),

  // LOCK (enabled by default)

  new ButtonBuilder()

    .setCustomId('ticket:lock')

    .setLabel('Lock')

    .setStyle(ButtonStyle.Secondary),

  // UNLOCK (disabled by default)

  new ButtonBuilder()

    .setCustomId('ticket:unlock')

    .setLabel('Unlock')

    .setStyle(ButtonStyle.Secondary)

    .setDisabled(true),

  new ButtonBuilder()

    .setCustomId('ticket:close:ask')

    .setLabel('Close Ticket')

    .setStyle(ButtonStyle.Danger)

);

const msg = await channel.send({

  content: supportRole ? `${supportRole}` : null,

  embeds: [embed],
    
  components: [claimRow],

  allowedMentions: {

    roles: supportRole ? [supportRole.id] : []

  }

});

await msg.pin();

  // Acknowledge user

  await interaction.editReply({

    ephemeral: true,

    embeds: [{

      title: `✅ Ticket Created`,

      description: `Your ticket has been created: ${channel}`,

      color: 0x57F287,

      footer: { text: `Apex • Ticket System` }

    }]

  });
  
    // ───── Ticket Creation Log ────

const logChannelId = config.logChannelId;

// Fetch with fallback so cache misses don't crash
try {

  const logChannel = guild.channels.cache.get(logChannelId)
    || await guild.channels.fetch(logChannelId).catch(() => null);

  if (logChannel) {

    const logEmbed = new EmbedBuilder()

      .setColor('Blue')

      .setTitle('🎟️ Ticket Created')

      .setDescription(

        `👤 User: ${user}\n` +

        `📂 Category: ${categoryName}\n` +

        `📌 Channel: ${channel}\n` +

        `🕒 Created: <t:${Math.floor(Date.now() / 1000)}:R>`

      )

      .setFooter({ text: 'Apex • Ticket Logs' });

    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});

  }

} catch (err) {

  console.log(`[Apex Ticket Log Error]`, err.message);

}
    
    return channel;

};

