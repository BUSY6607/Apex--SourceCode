const {

  EmbedBuilder,

  ModalBuilder,

  TextInputBuilder,

  TextInputStyle,

  ActionRowBuilder,
    
  ButtonBuilder 

} = require(`discord.js`);

const Report = require(`../models/Report`);

const ReportConfig = require(`../models/ReportConfig`);

const handleTicketButtons = require(`../ticket/design/buttons`);

const {

  handleModal,

  handleColorSelect

} = require(`../ticket/design/modals`);

const handleTicketCreate = require(`../ticket/user/handleTicketCreate`);

const stealHandler = require(`../handlers/stealHandler`);

// ── Application System ────────────────────────────────────────────────────────
const handleAppButtons     = require(`../application/design/appButtons`);
const handleAppSelectMenus = require(`../application/design/appSelectMenus`);
const { handleAppModalSubmit } = require(`../application/design/appModals`);
const {
  handleApplyTrigger,
  handleModalSubmit,
  handleAccept,
  handleRejectButton,
  handleRejectModal
} = require(`../application/user/handleAppSubmission`);

module.exports = {

  name: `interactionCreate`,

  async execute(interaction, saim) {

    const interactionStudioRouter = require(`../interaction/studio/runtime/interactionRouter`);

interactionStudioRouter(interaction);  
      
      /* ================= SLASH COMMANDS ================= */

    if (interaction.isChatInputCommand()) {

      const command = saim.commands.get(interaction.commandName);

      if (!command) return;

      return command.execute(interaction, saim);

    }

    /* ================= TICKET EDITOR BUTTONS ================= */

    if (interaction.isButton()) {
        
        // steal cmd 
        
        if (interaction.customId.startsWith(`steal_`)) {
  return stealHandler.handleButton(interaction);
}

        // ── Application editor buttons ──────────────────────────────────────
        if (interaction.customId.startsWith(`app_`)) {
  return handleAppButtons(interaction);
}

        // ── User apply buttons (from live panel) ─────────────────────────────
        if (interaction.customId.startsWith(`app:apply:`)) {
  const appId = interaction.customId.split(`:`)[2];
  return handleApplyTrigger(interaction, appId);
}

        // ── Application accept button ─────────────────────────────────────────
        if (interaction.customId.startsWith(`app:accept:`)) {
  const subId = interaction.customId.split(`:`)[2];
  return handleAccept(interaction, subId);
}

        // ── Application reject button ─────────────────────────────────────────
        if (interaction.customId.startsWith(`app:reject:`)) {
  const subId = interaction.customId.split(`:`)[2];
  return handleRejectButton(interaction, subId);
}

      // Ticket editor buttons ONLY (exclude create)

if (

  interaction.customId.startsWith(`ticket_`) &&

  !interaction.customId.startsWith(`ticket:create`)

) {

  return handleTicketButtons(interaction);

}
        
        // USER TICKET CREATION
if (interaction.customId.startsWith(`ticket:`)) {

  const TicketConfig = require('../models/TicketConfig');

  const ticketConfig = await TicketConfig.findOne({
    guildId: interaction.guild.id
  });

  if (ticketConfig?.isPaused) {
    return interaction.reply({
      embeds: [{
        title: `🚫 Ticket System Paused`,
        description: ticketConfig.pauseReason || `Ticket system temporarily disabled.`,
        color: 0xED4245,
        footer: { text: `Apex • Ticket System` }
      }],
      ephemeral: true
    });
  }

}
        
        if (interaction.customId.startsWith(`ticket:create:`)) {

  return handleTicketCreate(interaction);

}
        
        // ticket claim button
        
        if (interaction.customId === 'ticket:claim') {

    const handleTicketClaim = require('../ticket/user/handleTicketClaim');

    return handleTicketClaim(interaction);

  }
        
        // close button
        if (interaction.customId === 'ticket:close:ask') {

    const ask = require('../ticket/user/handleTicketCloseConfirm');

    return ask(interaction);

  }

  if (interaction.customId === 'ticket:close:confirm') {

    const close = require('../ticket/user/handleTicketClose');

    return close(interaction);

  }
        
        if (interaction.customId === 'ticket:lock') {

  const Ticket = require('../models/Ticket');

  const TicketConfig = require('../models/TicketConfig');

  const ticket = await Ticket.findOne({

    channelId: interaction.channel.id

  });

  if (!ticket) return;

  const config = await TicketConfig.findOne({

    guildId: interaction.guild.id

  });
            
            const isStaff =

    interaction.member.permissions.has('Administrator') ||

    interaction.member.roles.cache.has(config.supportRoleId);

  if (!isStaff) {

    return interaction.reply({

      ephemeral: true,

      content: '❌ You are not allowed to lock this ticket.'

    });

  }
            
            // ONLY SEND_MESSAGES DISABLED

  await interaction.channel.permissionOverwrites.edit(ticket.userId, {

    SendMessages: false

  });

  // Update buttons
            
            const oldRow = interaction.message.components[0];

const newRow = new ActionRowBuilder();

for (const btn of oldRow.components) {

  const button = ButtonBuilder.from(btn);

  if (button.data.custom_id === 'ticket:lock') {

    button.setDisabled(true);

  }

  if (button.data.custom_id === 'ticket:unlock') {

    button.setDisabled(false);

  }

  newRow.addComponents(button);

}

await interaction.message.edit({

  components: [newRow]

});

  return interaction.reply({

    ephemeral: true,

    content: '🔒 Ticket locked. User can view but cannot send messages.'

  });

}
        
        if (interaction.customId === 'ticket:unlock') {

  const Ticket = require('../models/Ticket');

  const TicketConfig = require('../models/TicketConfig');

  const ticket = await Ticket.findOne({

    channelId: interaction.channel.id

  });

  if (!ticket) return;
            
            const config = await TicketConfig.findOne({

    guildId: interaction.guild.id

  });

  const isStaff =

    interaction.member.permissions.has('Administrator') ||

    interaction.member.roles.cache.has(config.supportRoleId);

  if (!isStaff) {

    return interaction.reply({

      ephemeral: true,

      content: '❌ You are not allowed to unlock this ticket.'

    });

  }
            
            // RESTORE SEND_MESSAGES

  await interaction.channel.permissionOverwrites.edit(ticket.userId, {

    SendMessages: true

  });

  // Update buttons
            
            const oldRow = interaction.message.components[0];

const newRow = new ActionRowBuilder();

for (const btn of oldRow.components) {

  const button = ButtonBuilder.from(btn);

  if (button.data.custom_id === 'ticket:lock') {

    button.setDisabled(false);

  }

  if (button.data.custom_id === 'ticket:unlock') {

    button.setDisabled(true);

  }

  newRow.addComponents(button);

}

await interaction.message.edit({

  components: [newRow]

});

  return interaction.reply({

    ephemeral: true,

    content: '🔓 Ticket unlocked.'

  });

}

// close cancel confirmation  
        if (interaction.customId === 'ticket:close:cancel') {

    return interaction.reply({

      ephemeral: true,

      content: '❎ Ticket close cancelled.'

    });

  }

      // not a report button

      if (!interaction.customId.startsWith(`report_`)) return;

      /* ================= REPORT BUTTONS ================= */

      const [, action, reportId] = interaction.customId.split(`_`);

      const report = await Report.findOne({ reportId });

      if (!report || report.status !== `PENDING`) {

        return interaction.reply({

          embeds: [

            new EmbedBuilder()

              .setColor(`Red`)

              .setDescription(`❌ This report has already been handled.`)

          ],

          ephemeral: true

        });

      }

      const config = await ReportConfig.findOne({

        guildId: interaction.guild.id

      });

      /* ---------- ACCEPT REPORT ---------- */

      if (action === `accept`) {

        report.status = `ACCEPTED`;

        report.handledBy = interaction.user.id;

        await report.save();

        // edit review embed

        const oldEmbed = interaction.message.embeds[0];

        const updatedEmbed = EmbedBuilder.from(oldEmbed)

          .setColor(`Green`)

          .setFields(

            ...oldEmbed.fields.filter(f => f.name !== `📊 Status`),

            {

              name: `📊 Status`,

              value: `✅ Accepted by <@${interaction.user.id}>`,

              inline: false

            }

          );

        await interaction.message.edit({

          embeds: [updatedEmbed],

          components: []

        });

        // log channel

        const logchannel =

          interaction.guild.channels.cache.get(config.logChannelId);

        if (logchannel) {

          logchannel.send({

            embeds: [

              new EmbedBuilder()

                .setTitle(`Report Log`)

                .setColor(`Green`)

                .setDescription(

                  `🆔 **Report ID:** ${report.reportId}\n` +

                  `👤 **Reporter:** <@${report.reporterId}>\n` +

                  `🛠️ **Handled By:** <@${interaction.user.id}>\n\n` +

                  `✅ **Status:** Accepted`

                )

                .setFooter({ text: `Apex • Report System` })

                .setTimestamp()

            ]

          });

        }

        // reporter DM

        try {

          const user =

            await interaction.client.users.fetch(report.reporterId);

          await user.send({

            embeds: [

              new EmbedBuilder()

                .setColor(`Green`)

                .setTitle(`✅ Report Accepted`)

                .setDescription(

                  `Your report (**${report.reportId}**) was accepted.\n` +

                  `Necessary action will be taken shortly.`

                )

                .setFooter({ text: `Apex • Report System` })

            ]

          });

        } catch {}

        return interaction.reply({

          embeds: [

            new EmbedBuilder()

              .setColor(`Green`)

              .setDescription(`✅ Report accepted.`)

          ],

          ephemeral: true

        });

      }

      /* ---------- REJECT REPORT ---------- */

      if (action === `reject`) {

        const modal = new ModalBuilder()

          .setCustomId(`report_reject_modal_${reportId}`)

          .setTitle(`Reject Report`);

        modal.addComponents(

          new ActionRowBuilder().addComponents(

            new TextInputBuilder()

              .setCustomId(`reject_reason`)

              .setLabel(`Reason for Rejection`)

              .setStyle(TextInputStyle.Paragraph)

              .setRequired(true)

          )

        );

        return interaction.showModal(modal);

      }

    }

    /* ================= TICKET COLOR SELECT ================= */

    if (interaction.isStringSelectMenu()) {

        // ── Application editor select menus (color picker, question selector) ─
        if (interaction.customId.startsWith(`app_`)) {
  return handleAppSelectMenus(interaction);
}

        // ── User selects application from live panel ─────────────────────────
        if (interaction.customId === `app:select`) {
  const appId = interaction.values[0];
  return handleApplyTrigger(interaction, appId);
}

        // USER PANEL SELECT MENU EXECUTION
if (interaction.customId.startsWith(`user:panel:`) && interaction.customId.includes(`:sel:`)) {
 
  const parts = interaction.customId.split(`:`);
  // format: user:panel:PANELID:sel:SELECTCUSTOMID
  const panelId = parts[2];
  const selectCustomId = parts[4];
 
  const InteractionPanel = require(`../models/InteractionPanel`);
  const panel = await InteractionPanel.findById(panelId);
 
  if (!panel) return;
 
  // find the select component
  let foundSelect = null;
 
  for (const row of panel.actionRows) {
    for (const comp of row.components) {
      if (comp.type === `select` && comp.data.customId === selectCustomId) {
        foundSelect = comp;
        break;
          
          }
    }
  }
 
  if (!foundSelect) return;
 
  // find the matching option for the selected value
  const selectedValue = interaction.values[0];
 
  const matchedOption = foundSelect.data.options.find(opt => opt.value === selectedValue);
 
  if (!matchedOption || !matchedOption.action) {
    return interaction.reply({
      content: `❌ This option has no action configured.`,
        
        ephemeral: true
    });
  }
    
    const action = matchedOption.action;
  const visibility = matchedOption.visibility ?? `public`;
  const ephemeral = visibility === `ephemeral`;
 
  // ASSIGN ROLE
  if (action.type === `ASSIGN_ROLE`) {
 
    const role = interaction.guild.roles.cache.get(action.roleId);
    if (!role) return interaction.reply({ content: `❌ Role not found.`, ephemeral: true });
 
    if (!interaction.guild.members.me.permissions.has(`ManageRoles`)) {
      return interaction.reply({ content: `❌ I don't have permission to manage roles.`, ephemeral: true });
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
 
  // TOGGLE ROLE
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
 
  // CUSTOM MESSAGE
  if (action.type === `CUSTOM_MESSAGE`) {
    return interaction.reply({ content: action.content, ephemeral });
  }
    
    // SEND EMBED
  if (action.type === `SEND_EMBED`) {
 
    const InteractionEmbed = require(`../models/InteractionEmbed`);
    const embed = await InteractionEmbed.findById(action.embedId);
 
    if (!embed) return interaction.reply({ content: `❌ Embed not found.`, ephemeral: true });
 
    const safeEmbed = { ...embed.embed };
 
    if (typeof safeEmbed.image === `string`) safeEmbed.image = { url: safeEmbed.image };
    if (typeof safeEmbed.thumbnail === `string`) safeEmbed.thumbnail = { url: safeEmbed.thumbnail };
    if (!safeEmbed.color) safeEmbed.color = 0x3498db;
      
      const clean = (text) =>
      typeof text === `string` ? text.replace(/[\u200B-\u200D\uFEFF]/g, ``).trim() : null;
 
    safeEmbed.title = clean(safeEmbed.title);
    safeEmbed.description = clean(safeEmbed.description);
    if (!safeEmbed.title && !safeEmbed.description) safeEmbed.description = `‎`;
 
    return interaction.reply({ embeds: [safeEmbed], ephemeral });
 
  }
 
  return;
 
}

      if (interaction.customId === `ticket_color_select`) {

        return handleColorSelect(interaction);

      }
        
        // USER TICKET SELECT MENU 
    
        if (interaction.customId === `ticket:create`) {

  const TicketConfig = require('../models/TicketConfig');

  const ticketConfig = await TicketConfig.findOne({
    guildId: interaction.guild.id
  });

  if (ticketConfig?.isPaused) {
    return interaction.reply({
  embeds: [{
    title: `🚫 Ticket System Paused`,
    description: ticketConfig.pauseReason || `Ticket system temporarily disabled.`,
    color: 0xED4245,
    footer: { text: `Apex • Ticket System` }
  }],
  ephemeral: true
});
  }

  return handleTicketCreate(interaction);
}

    }
      
   // steal cmd modals   
      
      if (
  interaction.isModalSubmit() &&
  interaction.customId.startsWith(`steal_`)
) {
  return stealHandler.handleModal(interaction);
}

      // ── Application editor modals (title, desc, add app, add question etc.) ─
      if (
  interaction.isModalSubmit() &&
  interaction.customId.startsWith(`app_modal_`)
) {
  return handleAppModalSubmit(interaction);
}

      // ── User submits application questions modal ───────────────────────────
      if (
  interaction.isModalSubmit() &&
  interaction.customId.startsWith(`app:submit:`)
) {
  return handleModalSubmit(interaction);
}

      // ── Reviewer submits rejection reason ─────────────────────────────────
      if (
  interaction.isModalSubmit() &&
  interaction.customId.startsWith(`app:reject_reason:`)
) {
  const subId = interaction.customId.split(`:`).slice(2).join(`:`);
  return handleRejectModal(interaction, subId);
}

    /* ================= TICKET MODALS ================= */

    if (

      interaction.isModalSubmit() &&

      interaction.customId.startsWith(`ticket_modal_`)

    ) {

      return handleModal(interaction);

    }

    /* ================= REPORT REJECT MODAL ================= */

    if (

      interaction.isModalSubmit() &&

      interaction.customId.startsWith(`report_reject_modal_`)

    ) {

      const reportId = interaction.customId.split(`_`)[3];

      const reason =

        interaction.fields.getTextInputValue(`reject_reason`);

      const report = await Report.findOne({ reportId });

      const config = await ReportConfig.findOne({

        guildId: interaction.guild.id

      });

      report.status = `REJECTED`;

      report.rejectReason = reason;

      report.handledBy = interaction.user.id;

      await report.save();

      // edit review embed

      const reviewMsg =

        await interaction.channel.messages

          .fetch(report.reviewMessageId)

          .catch(() => null);

      if (reviewMsg) {

        const oldEmbed = reviewMsg.embeds[0];

        const updatedEmbed = EmbedBuilder.from(oldEmbed)

          .setColor(`Red`)

          .setFields(

            ...oldEmbed.fields.filter(f => f.name !== `📊 Status`),

            {

              name: `📊 Status`,

              value:

                `❌ Rejected by <@${interaction.user.id}>\n` +

                `**Reason:** ${reason}`,

              inline: false

            }

          );

        await reviewMsg.edit({

          embeds: [updatedEmbed],

          components: []

        });

      }

      // log channel

      const logchannel =

        interaction.guild.channels.cache.get(config.logChannelId);

      if (logchannel) {

        logchannel.send({

          embeds: [

            new EmbedBuilder()

              .setTitle(`Report Log`)

              .setColor(`Red`)

              .setDescription(

                `🆔 **Report ID:** ${report.reportId}\n` +

                `👤 **Reporter:** <@${report.reporterId}>\n` +

                `🛠️ **Handled By:** <@${interaction.user.id}>\n\n` +

                `❌ **Status:** Rejected`

              )

              .setFooter({ text: `Apex • Report System` })

              .setTimestamp()

          ]

        });

      }

      // reporter DM

      try {

        const user =

          await interaction.client.users.fetch(report.reporterId);

        await user.send({

          embeds: [

            new EmbedBuilder()

              .setColor(`Red`)

              .setTitle(`❌ Report Rejected`)

              .setDescription(

                `Your report (**${report.reportId}**) was rejected.\n\n` +

                `**Reason:** ${reason}`

              )

              .setFooter({ text: `Apex • Report System` })

          ]

        });

      } catch {}

      return interaction.reply({

        embeds: [

          new EmbedBuilder()

            .setColor(`Red`)

            .setDescription(`❌ Report rejected.`)

        ],

        ephemeral: true

      });

    }

  }

};


