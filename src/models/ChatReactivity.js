const { Schema, model } = require('mongoose');

// Each monitor watches ONE channel for inactivity
const monitorSchema = new Schema({
  id:                  { type: String, required: true },
  channelId:           { type: String, required: true },

  // Multiple roles AND/OR specific users can be pinged
  pingRoleIds:         { type: [String], default: [] },
  pingUserIds:         { type: [String], default: [] },

  inactivityMinutes:   { type: Number, required: true },
  customMessage:       { type: String, default: null },
  enabled:             { type: Boolean, default: true },

  // ── Ping mode ──────────────────────────────────────────────────────────
  // 'repeat' — keep pinging every cooldown window until someone replies
  // 'once'   — ping exactly once, then go silent until next message resets it
  pingMode:            { type: String, enum: ['repeat', 'once'], default: 'repeat' },
  pingCooldownMinutes: { type: Number, default: 60 },

  // ── Minimum message threshold ─────────────────────────────────────────────
  // Require at least N messages within a short burst window to count as "real" activity
  minMessageThreshold: { type: Number, default: 1 },
  // Rolling counter — reset whenever a "quiet gap" longer than 5 min is detected
  recentMessageCount:  { type: Number, default: 0 },

  // ── Business hours ─────────────────────────────────────────────────────────
  businessHoursEnabled: { type: Boolean, default: false },
  businessHoursStart:   { type: Number, default: 9 },   // 0-23, UTC-relative hour
  businessHoursEnd:     { type: Number, default: 17 },  // 0-23
  utcOffsetHours:       { type: Number, default: 0 },   // server's UTC offset, e.g. -5 for EST
  skipWeekends:         { type: Boolean, default: false },

  // ── Snooze ─────────────────────────────────────────────────────────────────
  snoozedUntil:        { type: Date, default: null },

  // ── Runtime state ──────────────────────────────────────────────────────────
  lastMessageAt:       { type: Date, default: Date.now },
  lastPingedAt:        { type: Date, default: null },
  // Has a ping already fired since the last real message? (for 'once' mode)
  pingFiredSinceActivity: { type: Boolean, default: false }
}, { _id: false });

// Audit log of every ping sent
const pingLogSchema = new Schema({
  monitorId: { type: String, required: true },
  channelId: { type: String, required: true },
  pingedAt:  { type: Date, default: Date.now },
  silentForMinutes: { type: Number, default: 0 }
}, { _id: false });

const chatReactivitySchema = new Schema({
  guildId:    { type: String, required: true, unique: true },
  monitors:   { type: [monitorSchema], default: [] },

  // Bot startup timestamp — used to suppress false-positive pings after downtime
  lastBotStartAt: { type: Date, default: Date.now },

  // Keep last 30 ping events for audit/history
  pingLog:    { type: [pingLogSchema], default: [] }
}, { timestamps: true });

chatReactivitySchema.index({ guildId: 1 });

module.exports = model('ChatReactivity', chatReactivitySchema);
