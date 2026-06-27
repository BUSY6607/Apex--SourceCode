const { Schema, model } = require('mongoose');

const censorConfigSchema = new Schema({

  guildId: {
    type: String,
    required: true,
    unique: true
  },

  enabled: {
    type: Boolean,
    default: false
  },

  // ── Word / Pattern List ───────────────────────────────────────────────────
  // Each entry: { pattern: String, isRegex: Boolean, severity: 'low'|'medium'|'high' }
  // low    → delete + warn
  // medium → delete + warn + timeout
  // high   → delete + ban
  words: {
    type: [
      {
        pattern:   { type: String, required: true },
        isRegex:   { type: Boolean, default: false },
        severity:  { type: String, enum: ['low', 'medium', 'high'], default: 'low' }
      }
    ],
    default: []
  },

  // ── Extra Filters ────────────────────────────────────────────────────────
  filterInviteLinks: { type: Boolean, default: false },
  filterAllLinks:    { type: Boolean, default: false },
  // Block messages with X% or more uppercase chars (0 = disabled)
  capsThreshold:     { type: Number,  default: 0    },
  // Block messages where the same word repeats N times (0 = disabled)
  repeatWordLimit:   { type: Number,  default: 0    },
  // Block messages with N+ user/role mentions (0 = disabled)
  massMentionLimit:  { type: Number,  default: 0    },

  // ── Escalation Thresholds (rolling 30-min window) ────────────────────────
  // Number of violations that trigger each action
  thresholds: {
    warn:    { type: Number, default: 1  }, // 1st violation  → warn
    timeout: { type: Number, default: 3  }, // 3rd violation  → timeout
    kick:    { type: Number, default: 5  }, // 5th violation  → kick
    ban:     { type: Number, default: 7  }  // 7th violation  → ban
  },

  // Timeout duration for auto-timeout action (minutes)
  timeoutDuration: { type: Number, default: 10 },

  // ── Exemptions ────────────────────────────────────────────────────────────
  // Roles that bypass the filter entirely
  exemptRoleIds:    { type: [String], default: [] },
  // Channels where the filter does not apply
  exemptChannelIds: { type: [String], default: [] },

  // ── Actions ───────────────────────────────────────────────────────────────
  // Whether to DM the user when their message is deleted
  dmOnDelete: { type: Boolean, default: true }

}, { timestamps: true });

censorConfigSchema.index({ guildId: 1 });

module.exports = model('CensorConfig', censorConfigSchema);
