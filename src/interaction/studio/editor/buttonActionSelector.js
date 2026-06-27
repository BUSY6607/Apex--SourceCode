const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function openButtonActionSelector() {

  return [

    new ActionRowBuilder().addComponents(

      new ButtonBuilder().setCustomId('apex:is:act:send_msg').setLabel('Send Embeds').setStyle(ButtonStyle.Primary),

      new ButtonBuilder().setCustomId('apex:is:act:send_custom').setLabel('Send Custom Message').setStyle(ButtonStyle.Primary),

      new ButtonBuilder().setCustomId('apex:is:act:open_url').setLabel('Open URL').setStyle(ButtonStyle.Secondary)

    ),

    new ActionRowBuilder().addComponents(

      new ButtonBuilder().setCustomId('apex:is:act:assign_role').setLabel('Assign Role').setStyle(ButtonStyle.Secondary),

      new ButtonBuilder().setCustomId('apex:is:act:toggle_role').setLabel('Toggle Role').setStyle(ButtonStyle.Secondary),

    ),

    new ActionRowBuilder().addComponents(

      new ButtonBuilder().setCustomId('apex:is:act:back_btn').setLabel('Back').setStyle(ButtonStyle.Danger)

    )

  ];

}

module.exports = { openButtonActionSelector };

