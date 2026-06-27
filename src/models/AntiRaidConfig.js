const { Schema, model } = require('mongoose');

// Each detected incident is recorded for audit purposes
const incidentSchema = new Schema({
  id:          { type: String, required: true },   // e.g. "AR-1A2B3"
  actionType:  { type: String, required: true },    // 'channelDelete', 'roleDelete', 'banAdd', 'channelCreate', 'roleCreate'
  actorId:     { type: String, required: true },     // who triggered it
  count:       { type: Number, required: true },     // how many actions in the window
  windowSeconds: { type: Number, required: true },
  responseTaken: { type: String, required: true },   // 'strip_roles' | 'kick' | 'ban' | 'lockdown_only'
  detectedAt:  { type: Date, default: Date.now }
}, { _id: false });

const antiRaidConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },

  enabled: { type: Boolean, default: false },

  // ── Per-action thresholds ────────────────────────────────────────────────────
  // count = how many actions, windowSeconds = within how many seconds
  thresholds: {
    channelDelete: { count: { type: Number, default: 3 }, windowSeconds: { type: Number, default: 10 } },
    channelCreate: { count: { type: Number, default: 10 }, windowSeconds: { type: Number, default: 30 } },
    roleDelete:    { count: { type: Number, default: 3 }, windowSeconds: { type: Number, default: 10 } },
    roleCreate:    { count: { type: Number, default: 10 }, windowSeconds: { type: Number, default: 30 } },
    banAdd:        { count: { type: Number, default: 5 }, windowSeconds: { type: Number, default: 20 } },
    kickAdd:       { count: { type: Number, default: 5 }, windowSeconds: { type: Number, default: 20 } }
  },

  // ── Response action when a raid is detected ──────────────────────────────────
  // 'strip_roles' — remove all roles from the actor (safest, reversible)
  // 'kick'         — kick the actor from the server
  // 'ban'          — ban the actor from the server
  // 'lockdown_only'— don't touch the actor, just lock the server
  responseAction: {
    type: String,
    enum: ['strip_roles', 'kick', 'ban', 'lockdown_only'],
    default: 'strip_roles'
  },

  // ── Server lockdown on detection ──────────────────────────────────────────────
  lockdownOnDetect: { type: Boolean, default: true },
  // How long the lockdown lasts before auto-lifting (minutes). 0 = manual lift only.
  lockdownDurationMinutes: { type: Number, default: 15 },

  // ── Exempt list — these users/roles are NEVER flagged ─────────────────────────
  exemptUserIds: { type: [String], default: [] },
  exemptRoleIds: { type: [String], default: [] },

  // ── Alert ──────────────────────────────────────────────────────────────────────
  alertChannelId: { type: String, default: null },
  alertRoleId:    { type: String, default: null }, // pinged on detection (e.g. @Owner)

  // ── Lockdown runtime state ────────────────────────────────────────────────────
  isLockedDown:      { type: Boolean, default: false },
  lockdownExpiresAt: { type: Date, default: null },
  // Snapshot of @everyone permissions before lockdown, to restore exactly
  preLockdownPerms:  { type: String, default: null }, // serialized permission bitfield

  // ── Audit log — keep last 30 incidents ────────────────────────────────────────
  incidents: { type: [incidentSchema], default: [] }

}, { timestamps: true });

antiRaidConfigSchema.index({ guildId: 1 });

module.exports = model('AntiRaidConfig', antiRaidConfigSchema);
