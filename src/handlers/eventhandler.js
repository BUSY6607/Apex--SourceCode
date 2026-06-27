const fs = require(`fs`);
const path = require(`path`);
module.exports = (saim) => {
    const eventspath = path.join(__dirname, `../events`);
    const eventFiles = fs.readdirSync(eventspath).filter(file => file.endsWith(`.js`));
    for (const file of eventFiles) {
        const filepath = path.join(eventspath, file);
        const event = require(filepath);

        if(event.once) {
            saim.once(event.name, (...args) => 
                event.execute(...args, saim));
            } else {
                saim.on(event.name, (...args) =>
                event.execute(...args, saim)); 
            }
        }
    };
