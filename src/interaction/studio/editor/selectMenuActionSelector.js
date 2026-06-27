const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require(`discord.js`);

function openSelectMenuActionSelector() {

  return [

    new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId(`apex:is:select:assign_role`)
        .setLabel(`Assign Role`)
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`apex:is:select:toggle_role`)
        .setLabel(`Toggle Role`)
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`apex:is:select:send_custom`)
        .setLabel(`Send Custom Message`)
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`apex:is:select:send_embed`)
        .setLabel(`Send Embed`)
        .setStyle(ButtonStyle.Primary)

    ),

    new ActionRowBuilder().addComponents(

      new ButtonBuilder()
        .setCustomId(`apex:is:select:none`)
        .setLabel(`No Action`)
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(`apex:is:select:back`)
        .setLabel(`Back`)
        .setStyle(ButtonStyle.Danger)

    )

  ];

}

module.exports = { openSelectMenuActionSelector };
