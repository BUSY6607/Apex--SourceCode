const {

  ApplicationCommandOptionType,

  PermissionFlagsBits,

  EmbedBuilder,

  ChannelType

} = require(`discord.js`);

const TicketConfig = require(`../models/TicketConfig`);

const { startEditor } = require(`../ticket/design/editor`);

const { getState } = require(`../utils/ticketState`);

module.exports = {

  name: `tickets`,

  description: `manage ticket system for this server`,

  options: [

    {

      name: `setup`,

      description: `setup ticket system for this server`,

      type: ApplicationCommandOptionType.Subcommand,

      options: [

        {

          name: `panel_channel`,

          description: `channel where ticket panel will be sent`,

          type: ApplicationCommandOptionType.Channel,

          required: true

        },

        {

          name: `log_channel`,

          description: `channel for ticket logs`,

          type: ApplicationCommandOptionType.Channel,

          required: true

        },

        {

          name: `support_role`,

          description: `role that will manage tickets`,

          type: ApplicationCommandOptionType.Role,

          required: true

        },

        {

          name: `parent_category`,

          description: `category where tickets will be created`,

          type: ApplicationCommandOptionType.Channel,

          channelTypes: [ChannelType.GuildCategory],

          required: true

        }

      ]

    },

    {

      name: `design`,

      description: `design the ticket panel`,

      type: ApplicationCommandOptionType.Subcommand

    },
    {

  name: `restorecomponents`,

  description: `restore paused ticket system`,

  type: ApplicationCommandOptionType.Subcommand,

  options: [

    {

      name: `panel_channel`,

      description: `select new panel channel`,

      type: ApplicationCommandOptionType.Channel,

      required: false

    },
    {

      name: `log_channel`,

      description: `select new log channel`,

      type: ApplicationCommandOptionType.Channel,

      required: false

    },

    {

      name: `support_role`,

      description: `select new support role`,

      type: ApplicationCommandOptionType.Role,

      required: false

    },
    {

      name: `parent_category`,

      description: `select new ticket category`,

      type: ApplicationCommandOptionType.Channel,

      channelTypes: [ChannelType.GuildCategory],

      required: false

    }

  ]

},
      {

  name: `disable`,

  description: `manually disable ticket system`,

  type: ApplicationCommandOptionType.Subcommand

},

{

  name: `enable`,

  description: `enable ticket system`,

  type: ApplicationCommandOptionType.Subcommand

}

  ],

  async execute(interaction) {

    /* ================= USER PERMISSION CHECK ================= */

    if (

      !interaction.member.permissions.has(

        PermissionFlagsBits.Administrator

      )

    ) {

      return interaction.reply({

        ephemeral: true,

        embeds: [

          new EmbedBuilder()

            .setColor(`Red`)

            .setDescription(

              `❌ **Permission Denied**\n\n` +

              `You must have **Administrator** permission to use this command.`

            )

            .setFooter({ text: `Apex • Ticket System` })

        ]

      });

    }

    const sub = interaction.options.getSubcommand();

    /* ================= DESIGN SUBCOMMAND ================= */

    if (sub === `design`) {
        
        const existingState = getState(interaction.guild.id);

      if (existingState) {

        return interaction.reply({

          ephemeral: true,

          embeds: [

            new EmbedBuilder()

              .setColor(`Red`)

              .setDescription(

                `⚠️ **Design Session Already Active**\n\n` +

                `Please finish or wait for the current editor to expire.`

              )

              .setFooter({ text: `Apex • Ticket System` })

          ]

        });

      }

      const config = await TicketConfig.findOne({

        guildId: interaction.guild.id

      });

      if (!config) {

        return interaction.reply({

          ephemeral: true,

          embeds: [

            new EmbedBuilder()

              .setColor(`Red`)

              .setDescription(

                `❌ **Ticket System Not Set Up**\n\n` +

                `Run \`/setuptickets setup\` first.`

              )

              .setFooter({ text: `Apex • Ticket System` })

          ]

        });

      }

      return startEditor(interaction);

    }

    /* ================= SETUP SUBCOMMAND ================= */

    if (sub === `setup`) {
        
        /* ================= BOT PERMISSION CHECK ================= */

        

        if (!interaction.guild.members.me.permissions.has(

    PermissionFlagsBits.ManageChannels

  )) {

    return interaction.reply({

      ephemeral: true,

      embeds: [

        new EmbedBuilder()

          .setColor(`Red`)

          .setDescription(

            `❌ **Bot Missing Permission**\n\n` +

            `I need **Manage Channels** permission to setup the ticket system.`

          )

          .setFooter({ text: `Apex • Ticket System` })

      ]

    });

  }

      const panelchannel = interaction.options.getChannel(`panel_channel`);

      const logchannel = interaction.options.getChannel(`log_channel`);

      const supportrole = interaction.options.getRole(`support_role`);

      const parentcategory = interaction.options.getChannel(`parent_category`);

      if (parentcategory.type !== ChannelType.GuildCategory) {

        return interaction.reply({

          ephemeral: true,

          embeds: [

            new EmbedBuilder()

              .setColor(`Red`)

              .setDescription(

                `❌ **Invalid Category Selected**\n\n` +

                `Please select a valid **category channel**.`

              )

              .setFooter({ text: `Apex • Ticket System` })

          ]

        });

      }

      const existingConfig = await TicketConfig.findOne({

        guildId: interaction.guild.id

      });

      if (existingConfig) {

        return interaction.reply({

          ephemeral: true,

          embeds: [

            new EmbedBuilder()

              .setColor(`Red`)

              .setDescription(

                `⚠️ **Ticket System Already Set Up**\n\n` +

                `Use \`/setuptickets design\` to customize the ticket panel.`

              )

              .setFooter({ text: `Apex • Ticket System` })

          ]

        });

      }

      await TicketConfig.create({

        guildId: interaction.guild.id,

        panelChannelId: panelchannel.id,

        logChannelId: logchannel.id,

        supportRoleId: supportrole.id,

        parentCategoryId: parentcategory.id,

        setupBy: interaction.user.id

      });

      const successEmbed = new EmbedBuilder()

        .setColor(`Green`)

        .setDescription(

          `✅ **Ticket System Initialized Successfully**\n\n` +

          `• **Panel Channel:** ${panelchannel}\n` +

          `• **Log Channel:** ${logchannel}\n` +

          `• **Support Role:** ${supportrole}\n` +

          `• **Parent Category:** ${parentcategory}\n\n` +

          `Next step: Use \`/setuptickets design\` to design the ticket panel.`

        )

        .setFooter({ text: `Apex • Ticket System` });

      return interaction.reply({

        embeds: [successEmbed]

      });

    }
      
      /* ================= RESTORE SUBCOMMAND ================= */

if (sub === `restorecomponents`) {

  const config = await TicketConfig.findOne({

    guildId: interaction.guild.id

  });

  if (!config) {

    return interaction.reply({

      ephemeral: true,

      embeds: [

        new EmbedBuilder()

          .setColor(`Red`)

          .setDescription(

            `❌ **Ticket System Not Found**\n\n` +

            `This server does not have a ticket system set up.`

          )

          .setFooter({ text: `Apex • Ticket System` })

      ]

    });

  }

  // already active

  if (!config.isPaused && !config.pauseReason && !interaction.options.data.length) {

    return interaction.reply({

      ephemeral: true,

      embeds: [

        new EmbedBuilder()

          .setColor(`Blue`)

          .setDescription(

            `ℹ️ **Ticket System Already Active**\n\n` +

            `No components need to be restored.`

          )

          .setFooter({ text: `Apex • Ticket System` })

      ]

    });

  }

  // restore 

    const panelChannel = interaction.options.getChannel(`panel_channel`);

const logChannel = interaction.options.getChannel(`log_channel`);

const supportRole = interaction.options.getRole(`support_role`);

const parentCategory = interaction.options.getChannel(`parent_category`);

let updated = [];
    
    if (panelChannel) {

  config.panelChannelId = panelChannel.id;

  updated.push(`Panel Channel`);

}

if (logChannel) {

  config.logChannelId = logChannel.id;

  updated.push(`Log Channel`);

}

if (supportRole) {

  config.supportRoleId = supportRole.id;

  updated.push(`Support Role`);

}

if (parentCategory) {

  config.parentCategoryId = parentCategory.id;

  updated.push(`Ticket Category`);

}
    
    if (updated.length === 0) {

  return interaction.reply({

    ephemeral: true,

    embeds: [

      new EmbedBuilder()

        .setColor(`Red`)

        .setDescription(

          `❌ **Nothing Selected**\n\n` +

          `Please select at least one component to restore.`

        )

        .setFooter({ text: `Apex • Ticket System` })

    ]

  });

}
    
    let embedNote = ``;

if (config.pauseReason?.toLowerCase().includes(`embed`)) {

  embedNote =

    `\n\n⚠️ **Panel embed was deleted**\n` +

    `Please run \`/tickets design\` to recreate the panel.`;

}
    
   // half restore guard
    
    if (

  !config.panelChannelId ||

  !config.logChannelId ||

  !config.supportRoleId ||

  !config.parentCategoryId

) {

  return interaction.reply({

    ephemeral: true,

    embeds: [

      new EmbedBuilder()

        .setColor(`Red`)

        .setDescription(

          `⚠️ **Incomplete Restore**\n\n` +

          `Please restore all required components before enabling the system.`

        )

        .setFooter({ text: `Apex • Ticket System` })

    ]

  });

}
    
    // resume System
    
    config.isPaused = false;

config.pauseReason = null;

config.pausedAt = null;

await config.save();
    
    return interaction.reply({

  embeds: [

    new EmbedBuilder()

      .setColor(`Green`)

      .setDescription(

        `✅ **Ticket System Restored**\n\n` +

        `Updated Components:\n• ${updated.join(`\n• `)}` +

        embedNote

      )

      .setFooter({ text: `Apex • Ticket System Recovery` })

  ]

});
    }
    
    /*===================Disable Sub Cmd===================*/
    
    if (sub === `disable`) {

  const config = await TicketConfig.findOne({

    guildId: interaction.guild.id

  });

  if (!config) {

    return interaction.reply({

      ephemeral: true,

      embeds: [

        new EmbedBuilder()

          .setColor(`Red`)

          .setDescription(`❌ Ticket system is not set up.`)

          .setFooter({ text: `Apex • Ticket System` })

      ]

    });

  }

  if (config.isPaused) {

    return interaction.reply({

      ephemeral: true,

      embeds: [

        new EmbedBuilder()

          .setColor(`Blue`)

          .setDescription(`ℹ️ Ticket system is already disabled.`)

          .setFooter({ text: `Apex • Ticket System` })

      ]

    });

  }

  config.isPaused = true;

  config.pauseReason = `Ticket system manually disabled by admin`;

  config.pausedAt = new Date();

  await config.save();

  return interaction.reply({

    embeds: [

      new EmbedBuilder()

        .setColor(`Red`)

        .setDescription(`🚫 **Ticket System Disabled**\n\nUsers can no longer create new tickets.`)

        .setFooter({ text: `Apex • Ticket System` })

    ]

  });

}
    
/*==================Enable Subcmd===============*/    
      
      if (sub === `enable`) {

  const config = await TicketConfig.findOne({

    guildId: interaction.guild.id

  });

  if (!config) {

    return interaction.reply({

      ephemeral: true,

      embeds: [

        new EmbedBuilder()

          .setColor(`Red`)

          .setDescription(`❌ Ticket system is not set up.`)

          .setFooter({ text: `Apex • Ticket System` })

      ]

    });

  }
          
          if (

  config.pauseReason &&

  !config.pauseReason.includes(`manually disabled`)

) {

  return interaction.reply({

    ephemeral: true,

    embeds: [

      new EmbedBuilder()

        .setColor(`Red`)

        .setDescription(

          `⚠️ **Ticket System Auto-Paused**\n\n` +

          `Critical components were deleted.\n` +

          `Please use \`/tickets restorecomponents\` instead of enable.`

        )

        .setFooter({ text: `Apex • Ticket System` })

    ]

  });

}

  if (!config.isPaused) {

    return interaction.reply({

      ephemeral: true,

      embeds: [

        new EmbedBuilder()

          .setColor(`Blue`)

          .setDescription(`ℹ️ Ticket system is already enabled.`)

          .setFooter({ text: `Apex • Ticket System` })

      ]

    });

  }
          
          // broken System guard
          
          if (

  !config.panelChannelId ||

  !config.logChannelId ||

  !config.supportRoleId ||

  !config.parentCategoryId

) {

  return interaction.reply({

    ephemeral: true,

    embeds: [

      new EmbedBuilder()

        .setColor(`Red`)

        .setDescription(

          `⚠️ **Incomplete Components**\n\n` +

          `Please restore all required components before enabling the system.`

        )

        .setFooter({ text: `Apex • Ticket System` })

    ]

  });

}

  config.isPaused = false;

  config.pauseReason = null;

  config.pausedAt = null;

  await config.save();

  return interaction.reply({

    embeds: [

      new EmbedBuilder()

        .setColor(`Green`)

        .setDescription(`✅ **Ticket System Enabled**\n\nUsers can create tickets again.`)

        .setFooter({ text: `Apex • Ticket System` })

    ]

  });

}

}

};

