const {

  ActionRowBuilder,

  StringSelectMenuBuilder

} = require(`discord.js`);

function buildColorMenu() {

  return new ActionRowBuilder().addComponents(

    new StringSelectMenuBuilder()

      .setCustomId(`apex:is:editor:color_select`)

      .setPlaceholder(`Select embed color`)

      .addOptions([

        { label: `Default`, value: `default` },

        { label: `Blue`, value: `blue` },

        { label: `Green`, value: `green` },

        { label: `Red`, value: `red` },

        { label: `Yellow`, value: `yellow` },

        { label: `Purple`, value: `purple` },

        { label: `Orange`, value: `orange` },

        { label: `Grey`, value: `grey` }

      ])

  );

}

module.exports = {

  buildColorMenu

};

