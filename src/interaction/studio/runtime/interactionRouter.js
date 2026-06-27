const {
  getSession,
  destroySession,
  lockSession,
  unlockSession,
  isSessionExpired
} = require(`../utils/sessionManager`);

const InteractionPanel = require(`../../../models/InteractionPanel`);

const { buildEditorEmbed } = require(`../editor/editorUpdate`);
const { buildMainEditorRow } = require(`../editor/mainEditorRow`);
const { buildColorMenu } = require(`../editor/colorMenu`);
const { openTitleModal } = require(`../editor/titleEditor`);
const { openDescriptionModal } = require(`../editor/descriptionEditor`);
const { openAuthorModal } = require(`../editor/authorEditor`);
const { openImageModal } = require(`../editor/imageEditor`);
const { openActionRowsManager, openActionRowEditor } = require(`../editor/actionRowsManager`);
const { openCreateActionRowModal } = require(`../editor/actionRowCreateModal`);
const { openEmbedSubEditor, buildEmbedEditorRows } = require(`../editor/embedSubEditor`);
const { SESSION_MODE } = require(`../constants/interactionEnums`);
const { openAddButtonModal } = require(`../editor/actionRowButtonModal`);
const { setTempActionRow, getTempActionRow, clearTempActionRow } = require(`./actionRowTempStore`);
const crypto = require(`crypto`);
const { setTempButton, getTempButton, clearTempButton } = require(`./buttonTempStore`);
const { buildCustomMessageModal } = require(`../editor/buttonCustomMessageModal`);
const { setTempSelectMenu, getTempSelectMenu, clearTempSelectMenu } = require(`./selectMenuTempStore`);
const InteractionSession = require(`../../../models/InteractionSession`);

/* ========================= ROUTER ========================= */

module.exports = async function interactionStudioRouter(interaction) {

  try {

    if (interaction.isModalSubmit()) {
      return handleModalSubmit(interaction);
    }

    if (interaction.isStringSelectMenu()) {
      return handleSelectMenu(interaction);
    }

    if (interaction.isRoleSelectMenu()) {
      return handleRoleSelect(interaction);
    }

    if (interaction.isButton()) {
      return handleButton(interaction);
    }

  } catch (err) {

    console.error(`Interaction Router Crash`);
    console.error(err);

  }

};

/* ========================= MODALS ========================= */

async function handleModalSubmit(interaction) {

  const session = await getSession(interaction.user.id);

  if (!session || isSessionExpired(session)) return;

  const panelId = session.panelId;

  /* ----- TITLE ----- */
  if (interaction.customId === `apex:is:embed:title_modal`) {

    await interaction.deferUpdate();
    await lockSession(session);

    await InteractionPanel.findByIdAndUpdate(panelId, {
      $set: { 'embed.title': interaction.fields.getTextInputValue(`embed_title`) }
    });

    await refreshEditor(interaction, panelId);
    await unlockSession(session);
    return;

  }

  /* ----- DESCRIPTION ----- */
  if (interaction.customId === `apex:is:embed:description_modal`) {

    await interaction.deferUpdate();
    await lockSession(session);

    await InteractionPanel.findByIdAndUpdate(panelId, {
      $set: { 'embed.description': interaction.fields.getTextInputValue(`embed_description`) }
    });

    await refreshEditor(interaction, panelId);
    await unlockSession(session);
    return;

  }

  /* ----- AUTHOR ----- */
  if (interaction.customId === `apex:is:embed:author_modal`) {

    await interaction.deferUpdate();
    await lockSession(session);

    await InteractionPanel.findByIdAndUpdate(panelId, {
      $set: {
        'embed.author': {
          name: interaction.fields.getTextInputValue(`embed_author_name`),
          iconURL: interaction.fields.getTextInputValue(`embed_author_icon`) || null
        }
      }
    });

    await refreshEditor(interaction, panelId);
    await unlockSession(session);
    return;

  }

  /* ----- IMAGE ----- */
  if (interaction.customId === `apex:is:embed:image_modal`) {

    await interaction.deferUpdate();
    await lockSession(session);

    await InteractionPanel.findByIdAndUpdate(panelId, {
      $set: {
        'embed.image': interaction.fields.getTextInputValue(`embed_image_url`) || null,
        'embed.thumbnail': interaction.fields.getTextInputValue(`embed_thumbnail_url`) || null
      }
    });

    await refreshEditor(interaction, panelId);
    await unlockSession(session);
    return;

  }

  /* ----- ACTION ROW CREATE ----- */
  if (interaction.customId === `apex:is:editor:ar:create_modal`) {

    await interaction.deferUpdate();

    const row = {
      rowId: crypto.randomUUID(),
      name: interaction.fields.getTextInputValue(`ar_name`),
      components: []
    };

    setTempActionRow(interaction.message.id, row);

    session.mode = SESSION_MODE.ACTION_ROW_EDITOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: openActionRowEditor()
    });

  }

  /* ----- URL BUTTON MODAL ----- */
  if (interaction.customId === `apex:is:btn:url_modal`) {

    await interaction.deferUpdate();

    const btn = getTempButton(interaction.message.id);
    if (!btn) return;

    btn.action = {
      type: `OPEN_URL`,
      url: interaction.fields.getTextInputValue(`url_input`)
    };

    btn.visibility = null;

    session.mode = SESSION_MODE.BUTTON_VISIBILITY_SELECTOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { buildVisibilitySelector } = require(`../editor/visibilitySelector`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: buildVisibilitySelector()
    });

  }

  /* ----- BUTTON CUSTOM MESSAGE MODAL ----- */
  if (interaction.customId === `apex:is:btn:custom_msg_modal`) {

    await interaction.deferUpdate();

    const btn = getTempButton(interaction.message.id);
    if (!btn) return;

    btn.action = {
      type: `CUSTOM_MESSAGE`,
      content: interaction.fields.getTextInputValue(`custom_msg_content`)
    };

    btn.visibility = null;

    session.mode = SESSION_MODE.BUTTON_VISIBILITY_SELECTOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { buildVisibilitySelector } = require(`../editor/visibilitySelector`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: buildVisibilitySelector()
    });

  }

  /* ----- EDIT BUTTON LABEL MODAL ----- */
  if (interaction.customId === `apex:is:btn:edit_label_modal`) {

    await interaction.deferUpdate();

    const btn = getTempButton(interaction.message.id);
    if (!btn) return;

    btn.label = interaction.fields.getTextInputValue(`btn_label`);

    session.mode = SESSION_MODE.BUTTON_EDITOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { openButtonEditor } = require(`../editor/buttonEditor`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: openButtonEditor()
    });

  }

  /* ----- EDIT BUTTON EMOJI MODAL ----- */
  if (interaction.customId === `apex:is:btn:edit_emoji_modal`) {

    await interaction.deferUpdate();

    const btn = getTempButton(interaction.message.id);
    if (!btn) return;

    btn.emoji = interaction.fields.getTextInputValue(`btn_emoji`) || null;

    session.mode = SESSION_MODE.BUTTON_EDITOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { openButtonEditor } = require(`../editor/buttonEditor`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: openButtonEditor()
    });

  }

  /* ----- SELECT MENU CREATE MODAL ----- */
  if (interaction.customId === `apex:is:select:create_modal`) {

    const row = getTempActionRow(interaction.message.id);
    if (!row) return;

    await interaction.deferUpdate();

    const menu = {
      id: crypto.randomUUID(),
      type: `select`,
      customId: interaction.fields.getTextInputValue(`select_custom_id`),
      placeholder: interaction.fields.getTextInputValue(`select_placeholder`),
      minValues: parseInt(interaction.fields.getTextInputValue(`select_min`)) || 1,
      maxValues: parseInt(interaction.fields.getTextInputValue(`select_max`)) || 1,
      options: []
    };

    setTempSelectMenu(interaction.message.id, menu);

    session.mode = SESSION_MODE.SELECT_MENU_EDITOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { openSelectMenuEditor } = require(`../editor/selectMenuEditor`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: openSelectMenuEditor(menu)
    });

  }

  /* ----- SELECT MENU OPTION MODAL ----- */
  if (interaction.customId === `apex:is:select:option_modal`) {

    const menu = getTempSelectMenu(interaction.message.id);
    if (!menu) return;

    await interaction.deferUpdate();

    if (menu.options.length >= 25) {
      return interaction.followUp({
        ephemeral: true,
        embeds: [{
          color: 0xed4245,
          description: `❌ Maximum 25 options allowed in a select menu.`,
          footer: { text: `Apex • Interaction Studio` }
        }]
      });
    }

    const option = {
      label: interaction.fields.getTextInputValue(`opt_label`),
      value: interaction.fields.getTextInputValue(`opt_value`),
      description: interaction.fields.getTextInputValue(`opt_desc`) || null,
      emoji: interaction.fields.getTextInputValue(`opt_emoji`) || null,
      action: null,
      visibility: `public`
    };

    menu.options.push(option);

    session.mode = SESSION_MODE.SELECT_MENU_EDITOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { openSelectMenuEditor } = require(`../editor/selectMenuEditor`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: openSelectMenuEditor(menu)
    });

  }

  /* ----- SELECT MENU PLACEHOLDER MODAL ----- */
  if (interaction.customId === `apex:is:select:placeholder_modal`) {

    const menu = getTempSelectMenu(interaction.message.id);
    if (!menu) return;

    await interaction.deferUpdate();

    menu.placeholder = interaction.fields.getTextInputValue(`select_placeholder_input`);

    session.mode = SESSION_MODE.SELECT_MENU_EDITOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { openSelectMenuEditor } = require(`../editor/selectMenuEditor`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: openSelectMenuEditor(menu)
    });

  }

  /* ----- SELECT MENU MIN/MAX MODAL ----- */
  if (interaction.customId === `apex:is:select:minmax_modal`) {

    const menu = getTempSelectMenu(interaction.message.id);
    if (!menu) return;

    await interaction.deferUpdate();

    const rawMin = parseInt(interaction.fields.getTextInputValue(`select_min_input`));
    const rawMax = parseInt(interaction.fields.getTextInputValue(`select_max_input`));

    const min = isNaN(rawMin) ? 1 : Math.min(Math.max(rawMin, 1), 25);
    const max = isNaN(rawMax) ? 1 : Math.min(Math.max(rawMax, 1), 25);

    menu.minValues = min;
    menu.maxValues = Math.max(min, max);

    session.mode = SESSION_MODE.SELECT_MENU_EDITOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { openSelectMenuEditor } = require(`../editor/selectMenuEditor`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: openSelectMenuEditor(menu)
    });

  }

  /* ----- SELECT OPTION CUSTOM MESSAGE MODAL ----- */
  if (interaction.customId === `apex:is:select:custom_msg_modal`) {

    const menu = getTempSelectMenu(interaction.message.id);
    if (!menu) return;

    await interaction.deferUpdate();

    const option = menu.options[menu._editingOptionIndex ?? menu.options.length - 1];
    if (!option) return;

    option.action = {
      type: `CUSTOM_MESSAGE`,
      content: interaction.fields.getTextInputValue(`sel_custom_msg_content`)
    };

    option.visibility = null;
    session.mode = SESSION_MODE.SELECT_OPTION_VISIBILITY_SELECTOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { buildVisibilitySelector } = require(`../editor/visibilitySelector`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: buildVisibilitySelector()
    });

  }

  /* ----- ACTION ROW BUTTON MODAL ----- */
  if (interaction.customId === `apex:is:ar:button_modal`) {

    const row = getTempActionRow(interaction.message.id);
    if (!row) return;

    if (row.components.length >= 5) {
      return interaction.reply({
        embeds: [{
          color: 0xed4245,
          description: `❌ You cannot add more than 5 buttons in a single action row.\nPlease create a new action row to add more buttons.`,
          footer: { text: `Apex • Interaction Studio` }
        }],
        ephemeral: true
      });
    }

    await interaction.deferUpdate();

    const button = {
      id: crypto.randomUUID(),
      type: `button`,
      label: interaction.fields.getTextInputValue(`btn_label`),
      customId: interaction.fields.getTextInputValue(`btn_custom_id`),
      emoji: interaction.fields.getTextInputValue(`btn_emoji`) || null,
      action: null
    };

    row.components.push(button);
    setTempButton(interaction.message.id, button);

    session.mode = SESSION_MODE.BUTTON_EDITOR;
    await session.save();

    const { openButtonEditor } = require(`../editor/buttonEditor`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(await InteractionPanel.findById(session.panelId))],
      components: openButtonEditor()
    });

  }

}

/* ========================= SELECT MENU ========================= */

async function handleSelectMenu(interaction) {

  /* ----- USER PANEL: SELECT MENU EXECUTION ----- */
  // customId format: user:panel:${panelId}:sel:${compCustomId}
  if (interaction.customId.startsWith(`user:panel:`)) {

    const parts = interaction.customId.split(`:`);
    const panelId = parts[2];
    const compCustomId = parts[4];

    const panel = await InteractionPanel.findById(panelId);
    if (!panel) return;

    const plainPanel = panel.toObject ? panel.toObject() : panel;

    let foundSelect = null;
    for (const row of plainPanel.actionRows) {
      for (const comp of row.components) {
        if (comp.type === `select` && comp.data?.customId === compCustomId) {
          foundSelect = comp;
          break;
        }
      }
    }

    if (!foundSelect) return;

    // Collect all selected options that have an action configured
    const selectedOptions = interaction.values
      .map(val => foundSelect.data.options?.find(o => o.value === val))
      .filter(opt => opt?.action);

    if (!selectedOptions.length) {
      return interaction.reply({
        content: `❌ No action is configured for the selected option(s).`,
        ephemeral: true
      });
    }

    // For multi-select: batch all role changes together, send a single reply
    // For single-select or non-role actions: just execute the first match
    const roleActions = selectedOptions.filter(o =>
      o.action.type === `ASSIGN_ROLE` || o.action.type === `TOGGLE_ROLE`
    );
    const nonRoleOption = selectedOptions.find(o =>
      o.action.type !== `ASSIGN_ROLE` && o.action.type !== `TOGGLE_ROLE`
    );

    if (roleActions.length) {

      // Batch all role adds/removes from every selected option
      if (!interaction.guild.members.me.permissions.has(`ManageRoles`)) {
        return interaction.reply({ content: `❌ I don't have permission to manage roles.`, ephemeral: true });
      }

      const member = interaction.member;
      const addedList = [];
      const removedList = [];

      for (const opt of roleActions) {
        const act = opt.action;

        if (act.type === `ASSIGN_ROLE`) {
          const role = interaction.guild.roles.cache.get(act.roleId);
          if (!role || role.position >= interaction.guild.members.me.roles.highest.position) continue;
          if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            removedList.push(`<@&${role.id}>`);
          } else {
            await member.roles.add(role);
            addedList.push(`<@&${role.id}>`);
          }
        }

        if (act.type === `TOGGLE_ROLE`) {
          const addSet = new Set(act.addRoleIds || []);
          const removeSet = new Set(act.removeRoleIds || []);
          for (const roleId of addSet) removeSet.delete(roleId);

          for (const roleId of removeSet) {
            const role = interaction.guild.roles.cache.get(roleId);
            if (!role || role.position >= interaction.guild.members.me.roles.highest.position) continue;
            if (member.roles.cache.has(roleId)) {
              await member.roles.remove(roleId);
              removedList.push(`<@&${roleId}>`);
            }
          }

          for (const roleId of addSet) {
            const role = interaction.guild.roles.cache.get(roleId);
            if (!role || role.position >= interaction.guild.members.me.roles.highest.position) continue;
            if (!member.roles.cache.has(roleId)) {
              await member.roles.add(roleId);
              addedList.push(`<@&${roleId}>`);
            }
          }
        }
      }

      // Use visibility from first selected role option
      const ephemeral = (roleActions[0].visibility ?? `public`) === `ephemeral`;

      return interaction.reply({
        embeds: [{
          color: 0x57f287,
          description: `🎭 **Roles Updated**\n\n**Added:**\n${addedList.length ? addedList.join(`\n`) : `/`}\n\n**Removed:**\n${removedList.length ? removedList.join(`\n`) : `/`}`,
          footer: { text: `Apex • Interaction Studio` }
        }],
        ephemeral
      });

    }

    if (nonRoleOption) {
      return executeAction(interaction, nonRoleOption.action, nonRoleOption.visibility ?? `public`);
    }

    return;

  }

  /* ----- STUDIO: OPTION PICKER (which option to configure) ----- */
  if (interaction.customId === `apex:is:select:pick_option`) {

    await interaction.deferUpdate();

    const session = await getSession(interaction.user.id);
    if (!session) return;

    const menu = getTempSelectMenu(interaction.message.id);
    if (!menu) return;

    const optionIndex = parseInt(interaction.values[0]);
    if (isNaN(optionIndex) || !menu.options[optionIndex]) return;

    menu._editingOptionIndex = optionIndex;

    session.mode = SESSION_MODE.SELECT_MENU_ACTION_SELECTOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { openSelectMenuActionSelector } = require(`../editor/selectMenuActionSelector`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: openSelectMenuActionSelector()
    });

  }

  /* ----- STUDIO: SEND EMBED BINDING (button action) ----- */
  if (interaction.customId === `apex:is:select:send_embed`) {

    await interaction.deferUpdate();

    const session = await getSession(interaction.user.id);
    if (!session) return;

    const btn = getTempButton(interaction.message.id);
    if (!btn) return;

    btn.action = {
      type: `SEND_EMBED`,
      embedId: interaction.values[0]
    };

    btn.visibility = null;

    session.mode = SESSION_MODE.BUTTON_VISIBILITY_SELECTOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { buildVisibilitySelector } = require(`../editor/visibilitySelector`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: buildVisibilitySelector()
    });

  }

  /* ----- STUDIO: SELECT OPTION SEND EMBED BINDING ----- */
  if (interaction.customId === `apex:is:select:select_send_embed`) {

    await interaction.deferUpdate();

    const session = await getSession(interaction.user.id);
    if (!session) return;

    const menu = getTempSelectMenu(interaction.message.id);
    if (!menu) return;

    const option = menu.options[menu._editingOptionIndex ?? menu.options.length - 1];
    if (!option) return;

    option.action = {
      type: `SEND_EMBED`,
      embedId: interaction.values[0]
    };

    option.visibility = null;
    session.mode = SESSION_MODE.SELECT_OPTION_VISIBILITY_SELECTOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { buildVisibilitySelector } = require(`../editor/visibilitySelector`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: buildVisibilitySelector()
    });

  }

  /* ----- STUDIO: COLOR SELECT ----- */
  if (interaction.customId !== `apex:is:editor:color_select`) return;

  const session = await getSession(interaction.user.id);
  if (!session || isSessionExpired(session)) return;

  const colorMap = {
    default: null,
    blue: 0x3498db,
    green: 0x57f287,
    red: 0xed4245,
    yellow: 0xfee75c,
    purple: 0x9b59b6,
    orange: 0xe67e22,
    grey: 0x95a5a6
  };

  await InteractionPanel.findByIdAndUpdate(session.panelId, {
    $set: { 'embed.color': colorMap[interaction.values[0]] }
  });

  await interaction.deferUpdate();
  await refreshEditor(interaction, session.panelId);

  if (session.mode === SESSION_MODE.EMBED_EDIT) {
    const panel = await InteractionPanel.findById(session.panelId);
    await interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: buildEmbedEditorRows(panel)
    });
  }

  return;

}

/* ========================= ROLE SELECT ========================= */

async function handleRoleSelect(interaction) {

  /* ----- BUTTON: ASSIGN ROLE ----- */
  if (interaction.customId === `apex:is:assign_role_select`) {

    const roleId = interaction.values[0];
    const session = await getSession(interaction.user.id);
    if (!session) return;

    const btn = getTempButton(interaction.message.id);
    if (!btn) {
      return interaction.reply({ content: `❌ Button session expired.`, ephemeral: true });
    }

    btn.action = {
      type: `ASSIGN_ROLE`,
      roleId
    };

    btn.visibility = null;

    session.mode = SESSION_MODE.BUTTON_VISIBILITY_SELECTOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { buildVisibilitySelector } = require(`../editor/visibilitySelector`);

    return interaction.update({
      embeds: [buildEditorEmbed(panel)],
      components: buildVisibilitySelector()
    });

  }

  /* ----- BUTTON: TOGGLE ROLE (ADD SIDE) ----- */
  if (interaction.customId === `apex:is:toggle_add_role`) {

    const session = await getSession(interaction.user.id);
    if (!session) return;

    const btn = getTempButton(interaction.message.id);
    if (!btn) return;

    btn.action = {
      type: `TOGGLE_ROLE`,
      addRoleIds: interaction.values,
      removeRoleIds: []
    };

    return interaction.update({
      embeds: [buildEditorEmbed(await InteractionPanel.findById(session.panelId))],
      components: [{
        type: 1,
        components: [{
          type: 6,
          custom_id: `apex:is:toggle_remove_roles`,
          placeholder: `Select roles to remove`,
          min_values: 1,
          max_values: 10
        }]
      }]
    });

  }

  /* ----- BUTTON: TOGGLE ROLE (REMOVE SIDE) ----- */
  if (interaction.customId === `apex:is:toggle_remove_roles`) {

    const session = await getSession(interaction.user.id);
    if (!session) return;

    const btn = getTempButton(interaction.message.id);
    if (!btn) return;

    btn.action.removeRoleIds = interaction.values;
    btn.visibility = null;

    session.mode = SESSION_MODE.BUTTON_VISIBILITY_SELECTOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { buildVisibilitySelector } = require(`../editor/visibilitySelector`);

    return interaction.update({
      embeds: [buildEditorEmbed(panel)],
      components: buildVisibilitySelector()
    });

  }

  /* ----- SELECT OPTION: ASSIGN ROLE ----- */
  if (interaction.customId === `apex:is:select:assign_role_select`) {

    const roleId = interaction.values[0];
    const session = await getSession(interaction.user.id);
    if (!session) return;

    const menu = getTempSelectMenu(interaction.message.id);
    if (!menu) return;

    const option = menu.options[menu._editingOptionIndex ?? menu.options.length - 1];
    if (!option) return;

    option.action = {
      type: `ASSIGN_ROLE`,
      roleId
    };

    option.visibility = null;
    session.mode = SESSION_MODE.SELECT_OPTION_VISIBILITY_SELECTOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { buildVisibilitySelector } = require(`../editor/visibilitySelector`);

    return interaction.update({
      embeds: [buildEditorEmbed(panel)],
      components: buildVisibilitySelector()
    });

  }

  /* ----- SELECT OPTION: TOGGLE ROLE (ADD SIDE) ----- */
  if (interaction.customId === `apex:is:select:toggle_add_role`) {

    const session = await getSession(interaction.user.id);
    if (!session) return;

    const menu = getTempSelectMenu(interaction.message.id);
    if (!menu) return;

    const option = menu.options[menu._editingOptionIndex ?? menu.options.length - 1];
    if (!option) return;

    option.action = {
      type: `TOGGLE_ROLE`,
      addRoleIds: interaction.values,
      removeRoleIds: []
    };
    return interaction.update({
      embeds: [buildEditorEmbed(await InteractionPanel.findById(session.panelId))],
      components: [{
        type: 1,
        components: [{
          type: 6,
          custom_id: `apex:is:select:toggle_remove_roles`,
          placeholder: `Select roles to remove`,
          min_values: 1,
          max_values: 10
        }]
      }]
    });

  }

  /* ----- SELECT OPTION: TOGGLE ROLE (REMOVE SIDE) ----- */
  if (interaction.customId === `apex:is:select:toggle_remove_roles`) {

    const session = await getSession(interaction.user.id);
    if (!session) return;

    const menu = getTempSelectMenu(interaction.message.id);
    if (!menu) return;

    const option = menu.options[menu._editingOptionIndex ?? menu.options.length - 1];
    if (!option) return;

    option.action.removeRoleIds = interaction.values;

    option.visibility = null;
    session.mode = SESSION_MODE.SELECT_OPTION_VISIBILITY_SELECTOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { buildVisibilitySelector } = require(`../editor/visibilitySelector`);

    return interaction.update({
      embeds: [buildEditorEmbed(panel)],
      components: buildVisibilitySelector()
    });

  }

}

/* ========================= BUTTONS ========================= */

async function handleButton(interaction) {

  /* ----- USER PANEL: BUTTON EXECUTION ----- */
  if (interaction.customId.startsWith(`user:panel:`)) {

    const InteractionEmbed = require(`../../../models/InteractionEmbed`);
    const [, , panelId, buttonId] = interaction.customId.split(`:`);

    const panel = await InteractionPanel.findById(panelId);
    if (!panel) return;

    let foundButton = null;

    for (const row of panel.actionRows) {
      for (const comp of row.components) {
        if (comp.type === `button` && comp.data.customId === buttonId) {
          foundButton = comp;
          break;
        }
      }
    }

    if (!foundButton || !foundButton.data?.action) {
      return interaction.reply({
        content: `❌ This button has no action configured.`,
        ephemeral: true
      });
    }

    return executeAction(interaction, foundButton.data.action, foundButton.data.visibility ?? `public`);

  }

  if (!interaction.customId.startsWith(`apex:is:`)) return;

  const session = await getSession(interaction.user.id);
  if (!session || isSessionExpired(session)) return;

  const [, , scope, action] = interaction.customId.split(`:`);

  /* ----- GLOBAL BACK (ACTION BINDING) ----- */
  if (interaction.customId === `apex:is:act:back_btn`) {

    await interaction.deferUpdate();

    session.mode = SESSION_MODE.BUTTON_EDITOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { openButtonEditor } = require(`../editor/buttonEditor`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: openButtonEditor()
    });

  }

  /* ----- EDITOR ROOT ----- */
  if (scope === `editor`) {

    const panel = await InteractionPanel.findById(session.panelId);

    if (action === `edit_embed`) {

      session.mode = SESSION_MODE.EMBED_EDIT;
      await session.save();
      return openEmbedSubEditor(interaction, session.panelId);

    }

    if (action === `action_rows`) {

      const rows = openActionRowsManager(panel);

      session.mode = SESSION_MODE.ACTION_ROW;
      await session.save();

      return interaction.update({
        embeds: [buildEditorEmbed(panel)],
        components: Array.isArray(rows) ? rows : []
      });

    }

    if (action === `publish`) {

      const panel = await InteractionPanel.findById(session.panelId);
      if (!panel) return;

      const clean = (text) =>
        typeof text === `string`
          ? text.replace(/[\u200B-\u200D\uFEFF]/g, ``).trim()
          : ``;

      const title = clean(panel.embed?.title);
      const description = clean(panel.embed?.description);

      if (!title && !description) {
        return interaction.reply({
          ephemeral: true,
          embeds: [{
            color: 0xed4245,
            description: `❌ You cannot publish an empty embed.\nPlease add a title or description.`,
            footer: { text: `Apex • Interaction Studio` }
          }]
        });
      }

      const InteractionEmbed = require(`../../../models/InteractionEmbed`);

      await InteractionEmbed.create({
        name: panel.name || `Embed-${Date.now()}`,
        guildId: interaction.guild.id,
        embed: panel.embed,
        createdBy: interaction.user.id
      });

      if (!panel.embed.color) {
        panel.embed.color = 0x3498db;
      }

      panel.published = true;
      await panel.save();

      const safeEmbed = buildSafeEmbed(panel.embed);

      await interaction.update({
        embeds: [safeEmbed],
        components: buildFinalComponents(panel)
      });

      await destroySession(session.userId);
      return;

    }

    if (action === `cancel`) {

      await destroySession(session.userId);
      return interaction.message.delete().catch(() => {});

    }

  }

  /* ----- SELECT MENU EDITOR ----- */
  if (scope === `select` && session.mode === SESSION_MODE.SELECT_MENU_EDITOR) {

    if (action === `add_option`) {

      const { openSelectOptionModal } = require(`../editor/selectOptionModal`);
      return interaction.showModal(openSelectOptionModal());

    }

    if (action === `edit_placeholder`) {

      const menu = getTempSelectMenu(interaction.message.id);
      if (!menu) return;

      const { openSelectMenuPlaceholderModal } = require(`../editor/selectMenuPlaceholderModal`);
      return interaction.showModal(openSelectMenuPlaceholderModal(menu.placeholder));

    }

    if (action === `set_minmax`) {

      const menu = getTempSelectMenu(interaction.message.id);
      if (!menu) return;

      const { openSelectMenuMinMaxModal } = require(`../editor/selectMenuMinMaxModal`);
      return interaction.showModal(openSelectMenuMinMaxModal(menu.minValues, menu.maxValues));

    }

    if (action === `bind_option_menu`) {

      const menu = getTempSelectMenu(interaction.message.id);
      if (!menu || !menu.options.length) return;

      await interaction.deferUpdate();

      const panel = await InteractionPanel.findById(session.panelId);

      return interaction.message.edit({
        embeds: [buildEditorEmbed(panel)],
        components: [{
          type: 1,
          components: [{
            type: 3,
            custom_id: `apex:is:select:pick_option`,
            placeholder: `Select an option to configure its action...`,
            options: menu.options.map((opt, i) => ({
              label: String(opt.label || `Option ${i + 1}`).substring(0, 25),
              value: String(i),
              description: opt.action?.type
                ? `✅ ${opt.action.type} • ${opt.visibility ?? `public`}`
                : `⚙️ No action set`
            }))
          }]
        }]
      });

    }

    if (action === `back`) {

      const panel = await InteractionPanel.findById(session.panelId);

      clearTempSelectMenu(interaction.message.id);

      session.mode = SESSION_MODE.ACTION_ROW_EDITOR;
      await session.save();

      return interaction.update({
        embeds: [buildEditorEmbed(panel)],
        components: openActionRowEditor()
      });

    }

    if (action === `save`) {

      const menu = getTempSelectMenu(interaction.message.id);
      if (!menu) return;

      if (menu.options.length === 0) {
        return interaction.reply({
          ephemeral: true,
          embeds: [{
            color: 0xed4245,
            description: `❌ Add at least one option before saving.`,
            footer: { text: `Apex • Interaction Studio` }
          }]
        });
      }

      const row = getTempActionRow(interaction.message.id);
      if (!row) return;

      row.components.push({
        id: menu.id,
        type: `select`,
        customId: menu.customId,
        placeholder: menu.placeholder,
        minValues: menu.minValues,
        maxValues: menu.maxValues,
        options: menu.options
      });

      clearTempSelectMenu(interaction.message.id);

      session.mode = SESSION_MODE.ACTION_ROW_EDITOR;
      await session.save();

      const panel = await InteractionPanel.findById(session.panelId);

      return interaction.update({
        embeds: [buildEditorEmbed(panel)],
        components: openActionRowEditor()
      });

    }

  }

  /* ----- SELECT OPTION ACTION SELECTOR ----- */
  if (scope === `select` && session.mode === SESSION_MODE.SELECT_MENU_ACTION_SELECTOR) {

    const menu = getTempSelectMenu(interaction.message.id);
    if (!menu) return;

    const option = menu.options[menu._editingOptionIndex ?? menu.options.length - 1];
    if (!option) return;

    if (action === `assign_role`) {

      await interaction.deferUpdate();

      const panel = await InteractionPanel.findById(session.panelId);

      return interaction.message.edit({
        embeds: [buildEditorEmbed(panel)],
        components: [{
          type: 1,
          components: [{
            type: 6,
            custom_id: `apex:is:select:assign_role_select`,
            placeholder: `Select role to assign`,
            min_values: 1,
            max_values: 1
          }]
        }]
      });

    }

    if (action === `toggle_role`) {

      await interaction.deferUpdate();

      const panel = await InteractionPanel.findById(session.panelId);

      return interaction.message.edit({
        embeds: [buildEditorEmbed(panel)],
        components: [{
          type: 1,
          components: [{
            type: 6,
            custom_id: `apex:is:select:toggle_add_role`,
            placeholder: `Select roles to add`,
            min_values: 1,
            max_values: 10
          }]
        }]
      });

    }

    if (action === `send_custom`) {

      const { buildSelectMenuCustomMsgModal } = require(`../editor/selectMenuCustomMsgModal`);
      return interaction.showModal(buildSelectMenuCustomMsgModal());

    }

    if (action === `send_embed`) {

      await interaction.deferUpdate();

      const InteractionEmbed = require(`../../../models/InteractionEmbed`);
      const embeds = await InteractionEmbed.find({ guildId: interaction.guildId });

      if (!embeds.length) {
        return interaction.followUp({
          ephemeral: true,
          embeds: [{
            color: 0xed4245,
            description: `❌ No saved embeds found. Create an embed first.`,
            footer: { text: `Apex • Interaction Studio` }
          }]
        });
      }

      return interaction.message.edit({
        embeds: [buildEditorEmbed(await InteractionPanel.findById(session.panelId))],
        components: [{
          type: 1,
          components: [{
            type: 3,
            custom_id: `apex:is:select:select_send_embed`,
            placeholder: `Select an embed`,
            options: embeds.map((e, i) => {
              const clean = (text) =>
                typeof text === `string`
                  ? text.replace(/[\u200B-\u200D\uFEFF]/g, ``).trim()
                  : ``;
              const raw = clean(e.embed?.title) || clean(e.embed?.description?.split(`\n`)[0]) || `Embed ${i + 1}`;
              return {
                label: raw.substring(0, 25) || `Embed ${i + 1}`,
                value: e._id.toString()
              };
            })
          }]
        }]
      });

    }

    if (action === `none`) {

      await interaction.deferUpdate();

      option.action = null;
      option.visibility = `public`;

      session.mode = SESSION_MODE.SELECT_MENU_EDITOR;
      await session.save();

      const panel = await InteractionPanel.findById(session.panelId);
      const { openSelectMenuEditor } = require(`../editor/selectMenuEditor`);

      return interaction.message.edit({
        embeds: [buildEditorEmbed(panel)],
        components: openSelectMenuEditor(menu)
      });

    }

    if (action === `back`) {

      await interaction.deferUpdate();

      session.mode = SESSION_MODE.SELECT_MENU_EDITOR;
      await session.save();

      const panel = await InteractionPanel.findById(session.panelId);
      const { openSelectMenuEditor } = require(`../editor/selectMenuEditor`);

      return interaction.message.edit({
        embeds: [buildEditorEmbed(panel)],
        components: openSelectMenuEditor(menu)
      });

    }

  }

  /* ----- SELECT OPTION VISIBILITY SELECTOR ----- */
  
  if (scope === `act` && session.mode === SESSION_MODE.SELECT_OPTION_VISIBILITY_SELECTOR) {

    await interaction.deferUpdate();

    const menu = getTempSelectMenu(interaction.message.id);
    if (!menu) return;

    const option = menu.options[menu._editingOptionIndex ?? menu.options.length - 1];
    if (!option) return;

    if (action === `set_public`) option.visibility = `public`;
    if (action === `set_ephemeral`) option.visibility = `ephemeral`;

    session.mode = SESSION_MODE.SELECT_MENU_EDITOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { openSelectMenuEditor } = require(`../editor/selectMenuEditor`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: openSelectMenuEditor(menu)
    });

  }

  /* ----- BUTTON EDITOR ----- */
  if (scope === `btn` && session.mode === SESSION_MODE.BUTTON_EDITOR) {

    if (action === `back_row`) {

      clearTempButton(interaction.message.id);

      session.mode = SESSION_MODE.ACTION_ROW_EDITOR;
      await session.save();

      return interaction.update({
        embeds: [buildEditorEmbed(await InteractionPanel.findById(session.panelId))],
        components: openActionRowEditor()
      });

    }

    if (action === `edit_label`) {

      return interaction.showModal({
        title: `Edit Button Label`,
        custom_id: `apex:is:btn:edit_label_modal`,
        components: [{
          type: 1,
          components: [{
            type: 4,
            custom_id: `btn_label`,
            label: `Button Label`,
            style: 1,
            required: true
          }]
        }]
      });

    }

    if (action === `edit_emoji`) {

      return interaction.showModal({
        title: `Edit Button Emoji`,
        custom_id: `apex:is:btn:edit_emoji_modal`,
        components: [{
          type: 1,
          components: [{
            type: 4,
            custom_id: `btn_emoji`,
            label: `Emoji (optional)`,
            style: 1,
            required: false
          }]
        }]
      });

    }

    if (action === `bind_action`) {

      session.mode = SESSION_MODE.BUTTON_ACTION_SELECTOR;
      await session.save();

      const { openButtonActionSelector } = require(`../editor/buttonActionSelector`);

      return interaction.update({
        embeds: [buildEditorEmbed(await InteractionPanel.findById(session.panelId))],
        components: openButtonActionSelector()
      });

    }

    return;

  }

  /* ----- BUTTON ACTION SELECTOR ----- */
  if (scope === `act` && session.mode === SESSION_MODE.BUTTON_ACTION_SELECTOR) {

    if (action === `toggle_role`) {

      await interaction.deferUpdate();

      const panel = await InteractionPanel.findById(session.panelId);

      return interaction.message.edit({
        embeds: [buildEditorEmbed(panel)],
        components: [{
          type: 1,
          components: [{
            type: 6,
            custom_id: `apex:is:toggle_add_role`,
            placeholder: `Select roles to add`,
            min_values: 1,
            max_values: 10
          }]
        }]
      });

    }

    if (action === `assign_role`) {

      await interaction.deferUpdate();

      const panel = await InteractionPanel.findById(session.panelId);

      return interaction.message.edit({
        embeds: [buildEditorEmbed(panel)],
        components: [{
          type: 1,
          components: [{
            type: 6,
            custom_id: `apex:is:assign_role_select`,
            placeholder: `Select role to assign`,
            min_values: 1,
            max_values: 1
          }]
        }]
      });

    }

    if (action === `open_url`) {

      const { buildURLModal } = require(`../editor/buttonURLModal`);
      return interaction.showModal(buildURLModal());

    }

    if (action === `send_custom`) {

      return interaction.showModal(buildCustomMessageModal());

    }

    if (action === `send_msg`) {

      const InteractionEmbed = require(`../../../models/InteractionEmbed`);
      const embeds = await InteractionEmbed.find({ guildId: interaction.guildId });

      if (!embeds.length) {
        return interaction.reply({
          ephemeral: true,
          embeds: [{
            color: 0xed4245,
            description: `❌ No saved embeds found.\nCreate an embed first.`,
            footer: { text: `Apex • Interaction Studio` }
          }]
        });
      }

      return interaction.update({
        embeds: [buildEditorEmbed(await InteractionPanel.findById(session.panelId))],
        components: [{
          type: 1,
          components: [{
            type: 3,
            custom_id: `apex:is:select:send_embed`,
            placeholder: `Select an embed`,
            options: embeds.map((e, i) => {
              const clean = (text) =>
                typeof text === `string`
                  ? text.replace(/[\u200B-\u200D\uFEFF]/g, ``).trim()
                  : ``;
              const raw = clean(e.embed?.title) || clean(e.embed?.description?.split(`\n`)[0]) || `Embed ${i + 1}`;
              return {
                label: raw.substring(0, 25) || `Embed ${i + 1}`,
                value: e._id.toString()
              };
            })
          }]
        }]
      });

    }

  }

  /* ----- VISIBILITY SELECTOR (BUTTON) ----- */
  if (scope === `act` && session.mode === SESSION_MODE.BUTTON_VISIBILITY_SELECTOR) {

    await interaction.deferUpdate();

    const btn = getTempButton(interaction.message.id);
    if (!btn) return;

    if (action === `set_public`) btn.visibility = `public`;
    if (action === `set_ephemeral`) btn.visibility = `ephemeral`;

    session.mode = SESSION_MODE.BUTTON_COLOR_SELECTOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { buildButtonColorSelector } = require(`../editor/buttonEditor`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: buildButtonColorSelector()
    });

  }

  /* ----- BUTTON COLOR SELECTOR ----- */
  if (scope === `btn_color` && session.mode === SESSION_MODE.BUTTON_COLOR_SELECTOR) {

    await interaction.deferUpdate();

    const btn = getTempButton(interaction.message.id);
    if (!btn) return;

    const map = { primary: 1, secondary: 2, success: 3, danger: 4 };

    btn.style = map[action] ?? 2;

    session.mode = SESSION_MODE.BUTTON_EDITOR;
    await session.save();

    const panel = await InteractionPanel.findById(session.panelId);
    const { openButtonEditor } = require(`../editor/buttonEditor`);

    return interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: openButtonEditor()
    });

  }

  /* ----- EMBED SUB EDITOR ----- */
  if (scope === `embed`) {

    if (action === `back`) {

      const panel = await InteractionPanel.findById(session.panelId);

      session.mode = SESSION_MODE.EDITOR;
      await session.save();

      return interaction.update({
        embeds: [buildEditorEmbed(panel)],
        components: [buildMainEditorRow()]
      });

    }

    const panel = await InteractionPanel.findById(session.panelId);

    if (action === `set_title`) return openTitleModal(interaction, panel?.embed?.title);
    if (action === `set_description`) return openDescriptionModal(interaction, panel?.embed?.description);
    if (action === `set_author`) return openAuthorModal(interaction, panel?.embed?.author);
    if (action === `set_image`) return openImageModal(interaction, panel?.embed?.image?.url || ``, panel?.embed?.thumbnail?.url || ``);

    if (action === `set_color`) {
      return interaction.update({ components: [buildColorMenu()] });
    }

  }

  /* ----- ACTION ROW LIST MODE ----- */
  if (session.mode === SESSION_MODE.ACTION_ROW) {

    if (action === `add`) {
      return openCreateActionRowModal(interaction);
    }

    if (action === `back`) {

      const panel = await InteractionPanel.findById(session.panelId);

      session.mode = SESSION_MODE.EDITOR;
      await session.save();

      return interaction.update({
        embeds: [buildEditorEmbed(panel)],
        components: [buildMainEditorRow()]
      });

    }

    return;

  }

  /* ----- ACTION ROW EDITOR MODE ----- */
  if (session.mode === SESSION_MODE.ACTION_ROW_EDITOR) {

    if (action === `add_button`) {

      const row = getTempActionRow(interaction.message.id);
      if (!row) return;

      const hasSelect = row.components.some(c => c.type === `select`);
      if (hasSelect) {
        return interaction.reply({
          ephemeral: true,
          embeds: [{
            color: 0xed4245,
            description: `❌ You cannot add buttons to a row that already has a select menu.\nCreate a new action row for buttons.`,
            footer: { text: `Apex • Interaction Studio` }
          }]
        });
      }

      return openAddButtonModal(interaction);

    }

    if (action === `add_select`) {

      const row = getTempActionRow(interaction.message.id);
      if (!row) return;

      const hasButtons = row.components.some(c => c.type === `button`);
      if (hasButtons) {
        return interaction.reply({
          ephemeral: true,
          embeds: [{
            color: 0xed4245,
            description: `❌ You cannot add a select menu to a row that already has buttons.`,
            footer: { text: `Apex • Interaction Studio` }
          }]
        });
      }

      const hasSelect = row.components.some(c => c.type === `select`);
      if (hasSelect) {
        return interaction.reply({
          ephemeral: true,
          embeds: [{
            color: 0xed4245,
            description: `❌ Only one select menu is allowed per action row.`,
            footer: { text: `Apex • Interaction Studio` }
          }]
        });
      }

      const { openSelectMenuCreateModal } = require(`../editor/selectMenuCreateModal`);
      return interaction.showModal(openSelectMenuCreateModal());

    }

    if (action === `save`) {

      const row = getTempActionRow(interaction.message.id);
      if (!row) return;

      await InteractionPanel.findByIdAndUpdate(session.panelId, {
        $push: {
          actionRows: {
            id: row.rowId,
            name: row.name,
            components: row.components.map(comp => {

              // ===== BUTTON =====
              if (comp.type === `button`) {
                return {
                  type: `button`,
                  data: {
                    customId: comp.customId,
                    label: comp.label,
                    style: comp.style ?? 2,
                    emoji: comp.emoji ?? null,
                    disabled: false,
                    action: comp.action ? {
                      type: comp.action.type,
                      content: comp.action.content ?? null,
                      embedId: comp.action.embedId ?? null,
                      url: comp.action.url ?? null,
                      roleId: comp.action.roleId ?? null,
                      addRoleIds: comp.action.addRoleIds ?? [],
                      removeRoleIds: comp.action.removeRoleIds ?? []
                    } : null,
                    visibility: comp.visibility ?? `public`
                  }
                };
              }

              // ===== SELECT MENU =====
              if (comp.type === `select`) {
                return {
                  type: `select`,
                  data: {
                    customId: comp.customId,
                    placeholder: comp.placeholder,
                    minValues: comp.minValues ?? 1,
                    maxValues: comp.maxValues ?? 1,
                    options: comp.options.map(opt => ({
                      label: opt.label,
                      value: opt.value,
                      description: opt.description ?? null,
                      emoji: opt.emoji ?? null,
                      action: opt.action ? {
                        type: opt.action.type,
                        content: opt.action.content ?? null,
                        embedId: opt.action.embedId ?? null,
                        roleId: opt.action.roleId ?? null,
                        addRoleIds: opt.action.addRoleIds ?? [],
                        removeRoleIds: opt.action.removeRoleIds ?? []
                      } : null,
                      // NEW: persist visibility per option
                      visibility: opt.visibility ?? `public`
                    }))
                  }
                };
              }

            }).filter(Boolean)
          }
        }
      });

      clearTempActionRow(interaction.message.id);
      clearTempButton(interaction.message.id);
      clearTempSelectMenu(interaction.message.id);

      session.mode = SESSION_MODE.ACTION_ROW;
      await session.save();

      const panel = await InteractionPanel.findById(session.panelId);

      return interaction.update({
        embeds: [buildEditorEmbed(panel)],
        components: openActionRowsManager(panel)
      });

    }

    if (action === `cancel`) {

      clearTempButton(interaction.message.id);
      clearTempActionRow(interaction.message.id);
      clearTempSelectMenu(interaction.message.id);

      session.mode = SESSION_MODE.ACTION_ROW;
      await session.save();

      const panel = await InteractionPanel.findById(session.panelId);

      return interaction.update({
        embeds: [buildEditorEmbed(panel)],
        components: openActionRowsManager(panel)
      });

    }

  }

}

/* ========================= ACTION EXECUTOR ========================= */

async function executeAction(interaction, action, visibility) {

  const ephemeral = visibility === `ephemeral`;

  if (action.type === `ASSIGN_ROLE`) {

    const role = interaction.guild.roles.cache.get(action.roleId);

    if (!role) {
      return interaction.reply({ content: `❌ Role not found.`, ephemeral: true });
    }

    if (!interaction.guild.members.me.permissions.has(`ManageRoles`)) {
      return interaction.reply({ content: `❌ I dont have permission to manage roles.`, ephemeral: true });
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ content: `❌ Role is higher than my role.`, ephemeral: true });
    }

    const member = interaction.member;
    let added = `/`;
    let removed = `/`;

    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
      removed = `<@&${role.id}>`;
    } else {
      await member.roles.add(role);
      added = `<@&${role.id}>`;
    }

    return interaction.reply({
      embeds: [{
        color: 0x57f287,
        description: `🎭 **Roles Updated**\n\n**Added:** ${added}\n**Removed:** ${removed}`,
        footer: { text: `Apex • Interaction Studio` }
      }],
      ephemeral
    });

  }

  if (action.type === `TOGGLE_ROLE`) {

    const member = interaction.member;
    const addedList = [];
    const removedList = [];

    const addSet = new Set(action.addRoleIds || []);
    const removeSet = new Set(action.removeRoleIds || []);

    for (const roleId of addSet) removeSet.delete(roleId);

    for (const roleId of removeSet) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role || role.position >= interaction.guild.members.me.roles.highest.position) continue;
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        removedList.push(`<@&${roleId}>`);
      }
    }

    for (const roleId of addSet) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role || role.position >= interaction.guild.members.me.roles.highest.position) continue;
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId);
        addedList.push(`<@&${roleId}>`);
      }
    }

    return interaction.reply({
      embeds: [{
        color: 0x57f287,
        description: `🎭 **User roles updated**\n\n**Added:**\n${addedList.length ? addedList.join(`\n`) : `/`}\n\n**Removed:**\n${removedList.length ? removedList.join(`\n`) : `/`}`,
        footer: { text: `Apex • Interaction Studio` }
      }],
      ephemeral
    });

  }

  if (action.type === `CUSTOM_MESSAGE`) {
    return interaction.reply({ content: action.content, ephemeral });
  }

  if (action.type === `SEND_EMBED`) {

    const InteractionEmbed = require(`../../../models/InteractionEmbed`);
    const embed = await InteractionEmbed.findById(action.embedId);

    if (!embed) {
      return interaction.reply({ content: `❌ Embed not found.`, ephemeral: true });
    }

    const safeEmbed = buildSafeEmbed(embed.embed);
    return interaction.reply({ embeds: [safeEmbed], ephemeral });

  }

  if (action.type === `OPEN_URL`) {
    return;
  }

}

/* ========================= HELPERS ========================= */

const { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require(`discord.js`);

function buildFinalComponents(panel) {
  const plainPanel = panel.toObject ? panel.toObject() : panel;

  if (!plainPanel.actionRows || plainPanel.actionRows.length === 0) return [];

  return plainPanel.actionRows.map(row => {

    const actionRow = new ActionRowBuilder();

    for (const comp of row.components) {

      // ===== BUTTON =====
      if (comp.type === `button` && comp.data) {

        const b = new ButtonBuilder()
          .setLabel(comp.data.label || `Button`)
          .setStyle(comp.data.style ?? 2)
          .setDisabled(comp.data.disabled ?? false);

        if (comp.data.action?.type === `OPEN_URL`) {
          b.setStyle(5);
          b.setURL(comp.data.action.url);
        } else {
          b.setCustomId(`user:panel:${plainPanel._id}:${comp.data.customId}`);
        }

        if (comp.data.emoji) {
          const emoji = String(comp.data.emoji).trim();
          const match = emoji.match(/^<a?:\w+:(\d+)>$/);
          if (match) {
            b.setEmoji({ id: match[1] });
          } else {
            try { b.setEmoji(emoji); } catch {}
          }
        }

        actionRow.addComponents(b);

      }

      // ===== SELECT MENU =====
      if (comp.type === `select` && comp.data) {

        const options = Array.isArray(comp.data.options) ? comp.data.options : [];
        if (options.length === 0) continue;

        // clamp min/max to actual option count — prevents Discord rejecting
        const optCount  = options.length;
        const minValues = Math.min(Math.max(comp.data.minValues ?? 1, 1), optCount);
        const maxValues = Math.min(Math.max(comp.data.maxValues ?? 1, 1), optCount);

        const select = new StringSelectMenuBuilder()
          .setCustomId(`user:panel:${plainPanel._id}:sel:${comp.data.customId}`)
          .setPlaceholder(comp.data.placeholder || `Select an option`)
          .setMinValues(minValues)
          .setMaxValues(maxValues);

        for (const opt of options) {

          // ensure label and value are always safe non-empty strings
          const safeLabel = String(opt.label ?? ``).trim() || `Option`;
          const safeValue = String(opt.value ?? ``).trim();

          if (!safeValue) continue; // skip options with no value

          const option = new StringSelectMenuOptionBuilder()
            .setLabel(safeLabel.substring(0, 100))
            .setValue(safeValue.substring(0, 100));

          if (opt.description) {
            option.setDescription(String(opt.description).substring(0, 100));
          }

          if (opt.emoji) {
            const emoji = String(opt.emoji).trim();
            const match = emoji.match(/^<a?:\w+:(\d+)>$/);
            try {
              option.setEmoji(match ? { id: match[1] } : emoji);
            } catch {}
          }

          select.addOptions(option);

        }

        if (select.options.length > 0) {
          actionRow.addComponents(select);
        }

      }

    }

    return actionRow;

  });

}

function buildSafeEmbed(embedData) {

  const safeEmbed = { ...embedData };

  if (typeof safeEmbed.image === `string`) safeEmbed.image = { url: safeEmbed.image };
  if (typeof safeEmbed.thumbnail === `string`) safeEmbed.thumbnail = { url: safeEmbed.thumbnail };
  if (!safeEmbed.color) safeEmbed.color = 0x3498db;

  const clean = (text) =>
    typeof text === `string`
      ? text.replace(/[\u200B-\u200D\uFEFF]/g, ``).trim()
      : null;

  safeEmbed.title = clean(safeEmbed.title);
  safeEmbed.description = clean(safeEmbed.description);

  if (!safeEmbed.title && !safeEmbed.description) safeEmbed.description = `‎`;

  return safeEmbed;

}

async function refreshEditor(interaction, panelId) {

  const panel = await InteractionPanel.findById(panelId);
  const session = await getSession(interaction.user.id);

  if (session?.mode === SESSION_MODE.EMBED_EDIT) {
    await interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: buildEmbedEditorRows(panel)
    });
    return;
  }

  if (session?.mode === SESSION_MODE.ACTION_ROW) {
    const rows = openActionRowsManager(panel);
    await interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: Array.isArray(rows) ? rows : []
    });
    return;
  }

  if (session?.mode === SESSION_MODE.ACTION_ROW_EDITOR) {
    await interaction.message.edit({
      embeds: [buildEditorEmbed(panel)],
      components: openActionRowEditor()
    });
    return;
  }

  await interaction.message.edit({
    embeds: [buildEditorEmbed(panel)],
    components: [buildMainEditorRow()]
  });

}
