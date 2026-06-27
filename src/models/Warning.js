const { Schema, model } = require('mongoose');

const warningSchema = new Schema({
  guildId:   { type: String, required: true },
  userId:    { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason:    { type: String, required: true },
  warnId:    { type: String, required: true, unique: true },
}, { timestamps: true });

// Index for fast lookups by guild + user
warningSchema.index({ guildId: 1, userId: 1 });

module.exports = model('Warning', warningSchema);
