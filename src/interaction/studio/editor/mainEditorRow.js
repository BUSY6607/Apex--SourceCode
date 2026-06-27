const { ActionRowBuilder, ButtonBuilder } = require(`discord.js`);

function buildMainEditorRow() {

  return new ActionRowBuilder().addComponents(

    new ButtonBuilder()

      .setCustomId(`apex:is:editor:edit_embed`)

      .setLabel(`Edit Embed`)

      .setStyle(`Primary`),

    new ButtonBuilder()

      .setCustomId(`apex:is:editor:action_rows`)

      .setLabel(`Manage Action Rows`)

      .setStyle(`Secondary`),

    new ButtonBuilder()

      .setCustomId(`apex:is:editor:publish`)

      .setLabel(`Publish`)

      .setStyle(`Success`),

    new ButtonBuilder()

      .setCustomId(`apex:is:editor:cancel`)

      .setLabel(`Cancel`)

      .setStyle(`Danger`)

  );

}

module.exports = {

  buildMainEditorRow

};

