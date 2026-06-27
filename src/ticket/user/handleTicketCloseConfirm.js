const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = async function handleTicketCloseConfirm(interaction) {

  // Show confirm UI

  const row = new ActionRowBuilder().addComponents(

    new ButtonBuilder()

      .setCustomId('ticket:close:confirm')

      .setLabel('Confirm Close')

      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()

      .setCustomId('ticket:close:cancel')

      .setLabel('Cancel')

      .setStyle(ButtonStyle.Secondary)

  );

  return interaction.reply({

    ephemeral: true,

    embeds: [

      new EmbedBuilder()

        .setColor('Orange')

        .setDescription('⚠️ Are you sure you want to close this ticket?')

        .setFooter({ text: 'Apex • Ticket System' })

    ],

    components: [row]

  });

};

