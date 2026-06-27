const { Schema, model } = require(`mongoose`);

const TicketSchema = new Schema({

  guildId: {

    type: String,

    required: true

  },

  userId: {

    type: String,

    required: true

  },

  channelId: {

    type: String,

    required: true,

    unique: true

  },

  categoryValue: {

    type: String, // selected menu value

    required: true

  },

  claimedBy: {

    type: String,

    default: null

  },

  status: {

    type: String,

    enum: [`open`, `closed`],

    default: `open`

  },

  createdAt: {

    type: Date,

    default: Date.now

  },

  closedAt: {

    type: Date

  }

});

module.exports = model(`Ticket`, TicketSchema);

