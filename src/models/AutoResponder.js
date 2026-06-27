const { Schema, model } = require('mongoose');

// ── Per-trigger schema ────────────────────────────────────────────────────────
const triggerSchema = new Schema({

  triggerId: {
    type: String,
    required: true   // e.g. "AR-1A2B3C"
  },

  // ── Matching ───────────────────────────────────────────────────────────────
  type: {
    type: String,
    enum: ['exact', 'contains', 'startswith', 'endswith', 'regex'],
    default: 'contains'
  },

  trigger: {
    type: String,
    required: true   // the keyword / pattern
  },

  caseSensitive: {
    type: Boolean,
    default: false
  },

  // ── Response ───────────────────────────────────────────────────────────────
  responseType: {
    type: String,
    enum: ['text', 'embed', 'random'],
    default: 'text'
  },

  // For responseType 'text' or 'random' (array of strings, one picked randomly)
  responses: {
    type: [String],
    default: []
  },

  // For responseType 'embed'
  embedData: {
    title:       { type: String, default: null },
    description: { type: String, default: null },
    color:       { type: String, default: '#5865F2' },
    footer:      { type: String, default: null },
    imageUrl:    { type: String, default: null }
  },

  // ── Scoping ────────────────────────────────────────────────────────────────
  // Empty array = all channels allowed
  allowedChannelIds: { type: [String], default: [] },
  // Empty array = no channel is blocked
  blockedChannelIds: { type: [String], default: [] },
  // Empty array = all roles trigger it
  requiredRoleIds:   { type: [String], default: [] },
  // Empty array = no roles are ignored
  ignoredRoleIds:    { type: [String], default: [] },

  // ── Cooldown ──────────────────────────────────────────────────────────────
  // Per-user cooldown in seconds (0 = no cooldown)
  userCooldown:   { type: Number, default: 0  },
  // Global cooldown in seconds (0 = no cooldown)
  globalCooldown: { type: Number, default: 0  },

  // ── State ─────────────────────────────────────────────────────────────────
  enabled: { type: Boolean, default: true  },

  // ── Stats ─────────────────────────────────────────────────────────────────
  fireCount: { type: Number, default: 0 }

}, { _id: false });

// ── Guild-level config ────────────────────────────────────────────────────────
const autoResponderSchema = new Schema({

  guildId: {
    type: String,
    required: true,
    unique: true
  },

  enabled: {
    type: Boolean,
    default: true
  },

  // Hard cap: max triggers per guild
  maxTriggers: {
    type: Number,
    default: 50
  },

  triggers: {
    type: [triggerSchema],
    default: []
  }

}, { timestamps: true });

autoResponderSchema.index({ guildId: 1 });

module.exports = model('AutoResponder', autoResponderSchema);
