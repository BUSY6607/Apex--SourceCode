const {
  EmbedBuilder
} = require(`discord.js`);

const TicketConfig = require(`../../models/TicketConfig`);

const { deleteState } = require(`../../utils/ticketState`);

const sendLiveTicketPanel =  require(`../user/sendLiveTicketPanel`);

module.exports = async function publishPanel(interaction, state) {

  // Save panel design to DB

  const config = await TicketConfig.findOneAndUpdate(

  { guildId: interaction.guild.id },

  {

    panelEmbed: {

      title: state.embed.title,

      description: state.embed.description,

      color: state.embed.color,

      image: state.embed.image || null

    },

    categories: state.categories,

    ticketCreationMode: state.ticketCreationMode || `select`, // editor decision

    isPaused: false                          // LIVE

  },

  { upsert: true, new: true }

);

  // Build public embed

    await sendLiveTicketPanel(interaction.guild, config);

  // Cleanup

  deleteState(interaction.guild.id);

  return interaction.update({

    embeds: [

      new EmbedBuilder()

        .setColor(`Green`)

        .setDescription(

          `✅ **Ticket Panel Published Successfully**\n\n` +

          `Your ticket panel is now live.`

        )

        .setFooter({ text: `Apex • Ticket System` })

    ],

    components: []

  });

};

