const mongoose = require(`mongoose`);

const reportConfigSchema = new mongoose.Schema({

  guildId: { type: String, required: true, unique: true },

  reportChannelId: { type: String, required: true },

  reviewChannelId: { type: String, required: true },

  logChannelId: { type: String, required: true },

  reportRoleId: { type: String, required: true },

  enabled: { type: Boolean, default: true },

  paused: { type: Boolean, default: false },

  pausedReason: { type: String, default: null },

  setupByUserId: { type: String, required: true },

  setupByIsOwnerAtTime: { type: Boolean, required: true },

  createdAt: { type: Date, default: Date.now }

});

module.exports = mongoose.model(`ReportConfig`, reportConfigSchema);

