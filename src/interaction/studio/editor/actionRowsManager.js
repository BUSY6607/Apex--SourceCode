const {

  ActionRowBuilder,

  ButtonBuilder,

  ButtonStyle

} = require(`discord.js`);

const InteractionPanel = require(`../../../models/InteractionPanel`);

const { openAddButtonModal } = require(`./actionRowButtonModal`);

function openActionRowsManager(panel) {

  if (!panel) return [];

  const controlRow = new ActionRowBuilder().addComponents(

    new ButtonBuilder()

      .setCustomId(`apex:is:ar:add`)

      .setLabel(`➕ Add Action Row`)

      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()

      .setCustomId(`apex:is:ar:back`)

      .setLabel(`Back`)

      .setStyle(ButtonStyle.Secondary)

  );

  return [controlRow];

}

/* ===============================

   ACTION ROW EDITOR (TEMP)

   =============================== */

function openActionRowEditor() {

  const editorRow = new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId(`apex:is:ar:add_button`)

      .setLabel(`Add Button`)

      .setStyle(ButtonStyle.Primary),
      
      new ButtonBuilder()
      
      .setCustomId(`apex:is:ar:add_select`)
      
     .setLabel(`Add Select Menu`)
      
     .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()

      .setCustomId(`apex:is:ar:save`)

      .setLabel(`Save Action Row`)

      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()

      .setCustomId(`apex:is:ar:cancel`)

      .setLabel(`Back`)

      .setStyle(ButtonStyle.Secondary)

  );

  return [editorRow];

}

module.exports = {

  openActionRowsManager,

  openActionRowEditor

};

