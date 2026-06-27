require(`dotenv`).config();

const mongoose = require(`mongoose`);
mongoose.connect(process.env.uri).then(() => {
    console.log(`db connected`);
}).catch((err) => {
    console.log(`db not connected`);
    console.error(err);
});