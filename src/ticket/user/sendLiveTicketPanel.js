const { EmbedBuilder } = require(`discord.js`);

const buildTicketPanelComponents =

  require(`./buildTicketPanelComponents`);

module.exports = async function sendLiveTicketPanel(guild, config) {

  const channel = guild.channels.cache.get(config.panelChannelId);

  if (!channel) return;

  const embed = new EmbedBuilder()

    .setTitle(config.panelEmbed.title || `🎫 Support Tickets`)

    .setDescription(config.panelEmbed.description)

    .setColor(config.panelEmbed.color || `Blue`)

    .setFooter({

      text: config.panelEmbed.footer || `Apex • Ticket System`

    });

  if (config.panelEmbed.image) embed.setImage(config.panelEmbed.image);

  if (config.panelEmbed.thumbnail) embed.setThumbnail(config.panelEmbed.thumbnail);

  const components = buildTicketPanelComponents(config);

  await channel.send({

    embeds: [embed],

    components

  });

};

