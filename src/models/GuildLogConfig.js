const { Schema, model } = require(`mongoose`);

const guildLogConfigSchema = new Schema({

  guildId: {
    type: String,
    required: true,
    unique: true
  },

  enabled: {
    type: Boolean,
    default: false
  },

  categories: {
    moderation: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null }
    },

    messages: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null }
    },

    roles: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null }
    },

    channels: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null }
    },

    members: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null }
    },

    voice: {
      enabled: { type: Boolean, default: false },
      channelId: { type: String, default: null }
    }
  }

}, { timestamps: true });

module.exports = model(`GuildLogConfig`, guildLogConfigSchema);
