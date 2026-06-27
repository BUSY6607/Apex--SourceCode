const {

  ActionRowBuilder,

  ButtonBuilder,

  StringSelectMenuBuilder

} = require(`discord.js`);

function disableMessageComponents(message) {

  return message.components.map(row => {

    const newRow = ActionRowBuilder.from(row);

    newRow.components = newRow.components.map(component => {

      if (component instanceof ButtonBuilder) {

        return ButtonBuilder.from(component).setDisabled(true);

      }

      if (component instanceof StringSelectMenuBuilder) {

        return StringSelectMenuBuilder.from(component).setDisabled(true);

      }

      return component;

    });

    return newRow;

  });

}

module.exports = {

  disableMessageComponents

};

