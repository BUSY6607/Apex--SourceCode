const { ActionRowBuilder, ButtonBuilder } = require('discord.js');

function buildVisibilitySelector() {

  return [

    new ActionRowBuilder().addComponents(

      new ButtonBuilder()

        .setCustomId('apex:is:act:set_public')

        .setLabel('Public Reply')

        .setStyle(2),

      new ButtonBuilder()

        .setCustomId('apex:is:act:set_ephemeral')

        .setLabel('Ephemeral Reply')

        .setStyle(1)

    )

  ];

}

module.exports = { buildVisibilitySelector };

