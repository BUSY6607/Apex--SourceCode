const fs = require("fs");
const path = require("path");

module.exports = (saim) => {
    saim.commands = new Map();

    const commandsPath = path.join(__dirname, "../commands");
    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if (!command.name || !command.execute) {
            console.log(`❌ Invalid command file: ${file}`);
            continue;
        }

        saim.commands.set(command.name, command);
        console.log(`✔ Loaded command: ${command.name}`);
    }
};