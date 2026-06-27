const TicketConfig = require(`../../models/TicketConfig`);
const Ticket = require(`../../models/Ticket`);

const { EmbedBuilder } = require(`discord.js`);

module.exports = async function handleTicketCreate(interaction) {
    try {
        const { guildId, user } = interaction;
        
        //dupe ticket protection
        
        const hasOpen = await Ticket.findOne({

  guildId: interaction.guild.id,

  userId: interaction.user.id,

  status: 'open'

});

if (hasOpen) {

  return interaction.reply({

    embeds: [new EmbedBuilder()

            .setTitle(`❌️ Duplicate ticket detected`) .setDescription(`Please resolve your current ticket first`) .setFooter({ text: `Apex • Ticket System` })],

    ephemeral: true

  });

}
        
        // resolve category value
        let categoryValue;
        
        if (interaction.isButton()) {
            // ticket:create:<categoryValue>
           categoryValue = interaction.customId.split(`:`)[2];
        }
        
        if (interaction.isStringSelectMenu()) {
            categoryValue = interaction.values?.[0];
        }
        
        if(!categoryValue) {
            return interaction.reply({
                ephemeral: true,
                embeds: [{
                  title: `❌️ Invalid Category`,
                    description: `No valid ticket category was selected!`,
                    color: 0xED4245,
                    footer: { text: `Apex • Ticket System` }
                }]
            });
        }
        
        // fetch ticket config (panel)
       const config = await TicketConfig.findOne({ guildId });
        
        if(!config) {
            return interaction.reply({
                ephemeral: true,
                embeds: [{
                    title: `❌️ Ticket System Not Set!`,
                    description: `This server has not set up ticket system yet.`,
                    color: 0xED4245,
                    footer: { text: `Apex • Ticket System` }
                }]  
            });
        }
        
        if (config.isPaused) {
            return interaction.reply({
                ephemeral: true,
                embeds: [{

          title: `⏸️ Ticket System Paused`,

          description: `Ticket creation is temporarily disabled.`,

          color: 0xFAA61A,

          footer: { text: `Apex • Ticket System` }

        }]
               }); 
        }
        
        const category = config.categories.find( c => c.value === categoryValue );
        
        if (!category) {

      return interaction.reply({

        ephemeral: true,

        embeds: [{

          title: `❌ Category Not Found`,

          description: `This ticket category no longer exists.`,

          color: 0xED4245,

          footer: { text: `Apex • Ticket System` }

        }]

      });

    }
        
        const handleTicketValidation =

  require(`./handleTicketValidation`);

const validation = await handleTicketValidation({

  interaction,

  config,

  category

});

if (!validation) return;

        const handleTicketChannelCreate =

  require(`./handleTicketChannelCreate`);

const channel = await handleTicketChannelCreate({

  interaction,

  config,

  category,

  ticketId: Date.now(), 

  creationMode: interaction.isButton() ? 'button' : 'select'

});

if (!channel) return;
        
    } catch (err) {
        console.log(`[Apex Ticket Step 4.1]`, err);
        
        if(interaction.replied) return;
        
        return interaction.reply({
            ephemeral: true,
            embeds: [{
                title: `❌️ Error`,
                description: `Something went wrong while starting your ticket.`,
                color: 0xED4245,
                footer: { text: `Apex • Ticket System` }
            }]
        });
    }
};