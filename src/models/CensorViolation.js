const { Schema, model } = require('mongoose');

const censorViolationSchema = new Schema({

  guildId:  { type: String, required: true },
  userId:   { type: String, required: true },

  // Rolling log of violations
  violations: {
    type: [
      {
        matchedPattern: { type: String },    // what triggered it
        channelId:      { type: String },    // where it happened
        messageSnippet: { type: String },    // first 100 chars of the deleted msg
        action:         { type: String },    // 'delete' | 'warn' | 'timeout' | 'kick' | 'ban'
        at:             { type: Date, default: Date.now }
      }
    ],
    default: []
  },

  // Convenience counter — total violations ever (never decrements)
  totalViolations: { type: Number, default: 0 }

}, { timestamps: true });

// Compound index for fast per-guild-user lookups
censorViolationSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = model('CensorViolation', censorViolationSchema);
