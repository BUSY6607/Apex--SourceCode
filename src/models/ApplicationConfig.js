const { Schema, model } = require('mongoose');

const questionSchema = new Schema({
  id:          { type: String, required: true },
  label:       { type: String, required: true },
  placeholder: { type: String, default: null },
  style:       { type: String, enum: ['short', 'paragraph'], default: 'paragraph' },
  required:    { type: Boolean, default: true }
}, { _id: false });

const applicationSchema = new Schema({
  id:            { type: String, required: true },
  label:         { type: String, required: true },
  description:   { type: String, default: null },
  emoji:         { type: String, default: null },
  roleId:        { type: String, default: null },
  cooldownHours: { type: Number, default: 24   }, // reapply cooldown per application
  questions:     { type: [questionSchema], default: [] }
}, { _id: false });

const applicationConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },

  // ── Setup ──────────────────────────────────────────────────────────────────
  reviewChannelId: { type: String, default: null },
  logChannelId:    { type: String, default: null },
  supportRoleId:   { type: String, default: null },  // role allowed to accept/reject

  // ── Panel design ─────────────────────────────────────────────────────────
  panelEmbed: {
    title:       { type: String, default: '📋 Applications' },
    description: { type: String, default: 'Select an application below to apply.' },
    color:       { type: String, default: 'Blue' },
    image:       { type: String, default: null }
  },

  // ── Display mode ──────────────────────────────────────────────────────────
  displayMode: {
    type: String,
    enum: ['button', 'select'],
    default: 'select'
  },

  // ── Applications list ─────────────────────────────────────────────────────
  applications: { type: [applicationSchema], default: [] },

  // ── Panel state ───────────────────────────────────────────────────────────
  panelChannelId:  { type: String, default: null },
  panelMessageId:  { type: String, default: null },
  isLive:          { type: Boolean, default: false },

  setupBy: { type: String, default: null }
}, { timestamps: true });

applicationConfigSchema.index({ guildId: 1 });

module.exports = model('ApplicationConfig', applicationConfigSchema);
