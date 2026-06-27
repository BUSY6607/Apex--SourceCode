const { ApplicationCommandOptionType, EmbedBuilder } = require(`discord.js`);

module.exports = {
    name: `avatar`,
    description: `Get user avatar`,
    
    options: [
        {
            name: `user`,
           description: `user whose avatar u want`,
           type: ApplicationCommandOptionType.User,
            required: false
        }
    ],
    
    async execute(interaction) {
        const user = interaction.options.getUser(`user`) || interaction.user;
        
        const avatarURL = user.displayAvatarURL({
            size: 1024,
            extension: `png`,
            dynamic: true
        });
        
        const embed = new EmbedBuilder()
       .setTitle(`🖼Avatar`)
       .setDescription(

        `👤 **User:** ${user}\n` +

        `🔗 **Avatar Link:** [Click Here](${avatarURL})`

      )
       .setImage(avatarURL)
       .setColor(`Blurple`)
       .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};