const fs = require(`fs`);

const path = require(`path`);

module.exports = async function generateTranscript(channel) {

  const messages = [];

  let lastId;

  while (true) {

    const fetched = await channel.messages.fetch({

      limit: 100,

      before: lastId

    });

    if (!fetched.size) break;

    fetched.forEach(msg => {

      if (!msg.author) return;

      messages.push({

        author: `${msg.author.tag}`,

        content: msg.content || `[embed / attachment]`,

        createdAt: msg.createdAt

      });

    });

    lastId = fetched.last().id;

  }

  messages.reverse();

  let transcript = `Transcript for #${channel.name}\n\n`;

  for (const msg of messages) {

    transcript += `[${msg.createdAt.toISOString()}] ${msg.author}: ${msg.content}\n`;

  }

  const filePath = path.join(

  process.cwd(),

  `transcripts`,

  `${channel.id}.txt`

);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  fs.writeFileSync(filePath, transcript);

  return filePath;

};

