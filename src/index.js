require(`dotenv`).config();

process.on(`unhandledRejection`, (reason, promise) => {
    console.log(`Unhandled Rejection at:`, promise);
    console.log(`Reason:`, reason);
});

process.on(`uncaughtException`, (err) => {
    console.log(`Uncaught Exception:`, err);
});

require(`./database/Mongo`);

const { Client, IntentsBitField, EmbedBuilder, Message } = require(`discord.js`);

const saim = new Client({
    intents: [
IntentsBitField.Flags.Guilds,
IntentsBitField.Flags.GuildMembers,
IntentsBitField.Flags.GuildMessages,
IntentsBitField.Flags.MessageContent,
IntentsBitField.Flags.GuildBans,
IntentsBitField.Flags.GuildVoiceStates
    ]
});

require(`./handlers/eventhandler`)(saim);
require(`./handlers/cmdhandler`)(saim);


saim.login(process.env.TOKEN);