const { Schema, model } = require('mongoose');

const applicationSubmissionSchema = new Schema({
  appId:       { type: String, required: true, unique: true }, // e.g. "SUB-1A2B3C"
  guildId:     { type: String, required: true },
  userId:      { type: String, required: true },

  // Which application type was applied for
  applicationId:    { type: String, required: true }, // the app's id field
  applicationLabel: { type: String, required: true },

  // Q&A pairs
  answers: [{
    question: { type: String },
    answer:   { type: String }
  }],

  // Review message for in-place editing
  reviewMessageId:   { type: String, default: null },
  reviewChannelId:   { type: String, default: null },

  // Decision
  status:       { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING' },
  reviewedBy:   { type: String, default: null },
  reviewedAt:   { type: Date,   default: null },
  rejectReason: { type: String, default: null },
  roleGranted:  { type: String, default: null },

  // Submission timestamp for cooldown tracking
  submittedAt:  { type: Date, default: Date.now },

  // Atomic lock — prevents race condition on double-click accept/reject
  locked:       { type: Boolean, default: false }

}, { timestamps: true });

applicationSubmissionSchema.index({ guildId: 1, userId: 1 });
applicationSubmissionSchema.index({ appId: 1 });

module.exports = model('ApplicationSubmission', applicationSubmissionSchema);
