const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const commands = [];

const commandsPath = path.join(__dirname, "src/commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    
    commands.push({
        name: command.name,
        description: command.description,
        options: command.options || []
    });
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("Refreshing slash commands...");
        
        await rest.put(
            Routes.applicationCommands(process.env.SAIM_ID),
            { body: commands }
        );

        console.log("Slash commands updated!");
    } catch (err) {
        console.error(err);
    }
})();