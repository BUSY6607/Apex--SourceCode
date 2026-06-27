const { Schema, model } = require('mongoose');

const conditionSchema = new Schema({
  id:            { type: String, required: true },
  triggerRoleId: { type: String, required: true },
  action:        { type: String, enum: ['add', 'remove'], required: true },
  targetRoleId:  { type: String, required: true },
  enabled:       { type: Boolean, default: true }   // per-condition toggle
}, { _id: false });

// Each apply run is recorded here
const applyLogSchema = new Schema({
  runAt:        { type: Date,   default: Date.now },
  runBy:        { type: String, required: true },   // userId
  membersTotal: { type: Number, default: 0 },
  rolesAdded:   { type: Number, default: 0 },
  rolesRemoved: { type: Number, default: 0 },
  skipped:      { type: Number, default: 0 },
  errors:       { type: Number, default: 0 },
  dryRun:       { type: Boolean, default: false }
}, { _id: false });

const rolesConnectionSchema = new Schema({
  guildId:    { type: String, required: true, unique: true },
  conditions: { type: [conditionSchema], default: [] },

  // Last 10 apply runs kept for audit
  applyLog:   { type: [applyLogSchema], default: [] }
}, { timestamps: true });

rolesConnectionSchema.index({ guildId: 1 });

module.exports = model('RolesConnection', rolesConnectionSchema);
