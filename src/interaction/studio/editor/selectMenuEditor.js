const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require(`discord.js`);

/**
 * @param {Object} menu - the temp select menu object
 */
function openSelectMenuEditor(menu) {

  const optionCount = menu?.options?.length ?? 0;
  const atLimit = optionCount >= 25;

  /* ----- ROW 1: build controls ----- */
  const row1 = new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId(`apex:is:select:add_option`)
      .setLabel(atLimit ? `Options Full (25/25)` : `Add Option (${optionCount}/25)`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(atLimit),

    new ButtonBuilder()
      .setCustomId(`apex:is:select:edit_placeholder`)
      .setLabel(`Edit Placeholder`)
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`apex:is:select:set_minmax`)
      .setLabel(`Set Min/Max`)
      .setStyle(ButtonStyle.Secondary)

  );

  /* ----- ROW 2: bind + save/back ----- */
  const row2 = new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId(`apex:is:select:bind_option_menu`)
      .setLabel(`Bind Option Action`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(optionCount === 0),

    new ButtonBuilder()
      .setCustomId(`apex:is:select:save`)
      .setLabel(`Save Select Menu`)
      .setStyle(ButtonStyle.Success)
      .setDisabled(optionCount === 0),

    new ButtonBuilder()
      .setCustomId(`apex:is:select:back`)
      .setLabel(`Back`)
      .setStyle(ButtonStyle.Danger)

  );

  const rows = [row1, row2];

  /* ----- ROW 3: option overview picker (only when options exist) ----- */
  // Shows a StringSelectMenu listing all options so user can see status at a glance.
  // No 5-button limit here — supports up to 25 options natively.
  if (optionCount > 0) {

    const optionPicker = new StringSelectMenuBuilder()
      .setCustomId(`apex:is:select:pick_option`)
      .setPlaceholder(`👁 View / configure an option...`)
      .setMinValues(1)
      .setMaxValues(1);

    for (let i = 0; i < menu.options.length; i++) {

      const opt = menu.options[i];
      const hasAction = !!opt.action?.type;

      const safeLabel = String(opt.label || `Option ${i + 1}`).substring(0, 25);
      const safeValue = String(i); // use index as value — always safe

      const optionBuilder = new StringSelectMenuOptionBuilder()
        .setLabel(safeLabel)
        .setValue(safeValue)
        .setDescription(hasAction ? `✅ ${opt.action.type}` : `⚙️ No action — click to bind`);

      optionPicker.addOptions(optionBuilder);

    }

    rows.push(new ActionRowBuilder().addComponents(optionPicker));

  }

  return rows;

}

module.exports = { openSelectMenuEditor };
