const mongoose = require(`mongoose`);

const reportSchema = new mongoose.Schema({

  reportId: { type: String, required: true, unique: true },

  guildId: { type: String, required: true },

  reporterId: { type: String, required: true },

  reportedContent: {

    type: String,

    default: `No message content provided`

  },

  attachments: {

  type: [

    {

      url: String,

      name: String

    }

  ],

  default: []

},

  status: {

    type: String,

    enum: [`PENDING`, `ACCEPTED`, `REJECTED`],

    default: `PENDING`

  },

  handledBy: { type: String, default: null },

  actionTaken: { type: String, default: null },
    
    reviewMessageId: {

  type: String,

  default: null

},

  rejectReason: { type: String, default: null }

}, { timestamps: true });

module.exports = mongoose.model(`Report`, reportSchema);

