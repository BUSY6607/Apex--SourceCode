const {

  ApplicationCommandOptionType,

  PermissionFlagsBits,

  EmbedBuilder,

  ActionRowBuilder,

  ButtonBuilder

} = require(`discord.js`);

const InteractionPanel = require(`../models/InteractionPanel`);

const { createSession } = require(`../interaction/studio/utils/sessionManager`);

const { PANEL_TYPE } = require(`../interaction/studio/constants/interactionEnums`);

module.exports = {

  name: `interaction`,

  description: `manage interaction studio for this server`,

  options: [

    {

      name: `studio`,

      description: `open interaction studio editor`,

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

              `You must have **Administrator** permission to use Interaction Studio.`

            )

            .setFooter({ text: `Apex • Interaction Studio` })

        ]

      });

    }
      
      const sub = interaction.options.getSubcommand();

    /* ================= STUDIO SUBCOMMAND ================= */

    if (sub === `studio`) {
        
        // perm check
        
        await interaction.deferReply();

      // create draft panel

      const panel = await InteractionPanel.create({

        guildId: interaction.guild.id,

        createdBy: interaction.user.id,

        panelType: PANEL_TYPE.USER,

        status: `draft`,

        embed: {}

      });

      // create editor session

      await createSession({

        userId: interaction.user.id,

        guildId: interaction.guild.id,

        panelId: panel._id

      });

      // editor embed

      const editorEmbed = new EmbedBuilder()

        .setTitle(`🧩 Apex Interaction Studio`)

        .setDescription(

          `You are now editing a new interaction panel.\n\n` +

          `Use the buttons below to design the embed and add interactions.`

        )

        .setColor(`Blue`)

        .setFooter({ text: `Apex • Interaction Studio` });

      // editor buttons

      const row = new ActionRowBuilder().addComponents(

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
        
        try {

  await interaction.channel.send({

    embeds: [editorEmbed],

    components: [row]

  });

  await interaction.deleteReply();

} catch (err) {

  return interaction.editReply({

    embeds: [

      new EmbedBuilder()

        .setColor(`Red`)

        .setDescription(

          `❌ **Bot Missing Permissions**\n\n` +

          `I cannot send messages in this channel.\n` +

          `Please grant:\n` +

          `• Send Messages\n` +

          `• Embed Links`

        )

        .setFooter({ text: `Apex • Interaction Studio` })

    ]

  });

}

    }

  }

};

