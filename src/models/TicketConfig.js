const { Schema, model } = require(`mongoose`);

const TicketConfigSchema = new Schema({

  guildId: {

    type: String,

    required: true,

    unique: true

  },

  // base setup

  panelChannelId: {

    type: String,

    required: true

  },

  logChannelId: {

    type: String,

    required: true

  },

  supportRoleId: {

    type: String,

    required: true

  },

  parentCategoryId: {

    type: String,

    required: true

  },

  // panel embed design

  panelEmbed: {

    title: String,

    description: String,

    color: {

      type: String,

      default: `Blue`

    },

    footer: {

      type: String,

      default: `Apex • Ticket System`

    },

    image: String,

    thumbnail: String

  },

  // select menu categories

  categories: [

    {

      label: String,

      value: String,        // internal key (support, report, appeal)

      description: String,

      emoji: String

    }

  ],

  // safety

  isPaused: {

    type: Boolean,

    default: false

  },
    
    pauseReason: {

  type: String,

  default: null

},

pausedAt: {

  type: Date,

  default: null

},

panelMessageId: {

  type: String

},

  setupBy: {

    type: String // admin userId

  },

  createdAt: {

    type: Date,

    default: Date.now

  },
    
    // ticket creation UI mode

ticketCreationMode: {

  type: String,

  enum: [`select`, `buttons`],

  default: `select`

},

});

module.exports = model(`TicketConfig`, TicketConfigSchema);

