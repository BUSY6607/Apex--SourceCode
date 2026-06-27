const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function openButtonEditor() {

  return [

    new ActionRowBuilder().addComponents(

      new ButtonBuilder().setCustomId('apex:is:btn:edit_label').setLabel('Edit Label').setStyle(ButtonStyle.Secondary),

      new ButtonBuilder().setCustomId('apex:is:btn:edit_emoji').setLabel('Edit Emoji').setStyle(ButtonStyle.Secondary)

    ),

    new ActionRowBuilder().addComponents(

      new ButtonBuilder().setCustomId('apex:is:btn:bind_action').setLabel('Bind Action').setStyle(ButtonStyle.Primary),

      new ButtonBuilder().setCustomId('apex:is:btn:back_row').setLabel('Back').setStyle(ButtonStyle.Danger)

    )

  ];

}

function buildButtonColorSelector() {

  return [{

    type: 1,

    components: [

      { type: 2, label: 'Blue', style: 1, custom_id: 'apex:is:btn_color:primary' },

      { type: 2, label: 'Grey', style: 2, custom_id: 'apex:is:btn_color:secondary' },

      { type: 2, label: 'Green', style: 3, custom_id: 'apex:is:btn_color:success' },

      { type: 2, label: 'Red', style: 4, custom_id: 'apex:is:btn_color:danger' }

    ]

  }];

}

module.exports = { openButtonEditor, buildButtonColorSelector };

