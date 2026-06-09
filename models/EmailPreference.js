const mongoose = require('mongoose');

const EmailPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Reminder type preferences
    reminderPreferences: {
      newApplication: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'immediate' },
        channel: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
      },
      interview: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'immediate' },
        channel: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
      },
      applicationStatus: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'daily' },
        channel: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
      },
      jobDeadline: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'daily' },
        channel: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
      },
      jobExpiring: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'daily' },
        channel: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
      },
      verification: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['immediate', 'daily', 'weekly'], default: 'immediate' },
        channel: { type: String, enum: ['email', 'in-app', 'both'], default: 'both' },
      },
    },

    // Global settings
    unsubscribeAll: {
      type: Boolean,
      default: false,
    },

    quietHours: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: '21:00' }, // HH:mm format
      endTime: { type: String, default: '07:00' },
    },

    digestPreferences: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
      time: { type: String, default: '09:00' }, // HH:mm format
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailPreference', EmailPreferenceSchema);