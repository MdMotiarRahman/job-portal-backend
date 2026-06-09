const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema(
  {
    // User who will receive the reminder
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Type of reminder
    type: {
      type: String,
      // No strict enum to allow digest-* and dynamically added reminder types
      required: true,
      index: true,
    },

    // Title and description
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // Related entities
    relatedEntity: {
      job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        default: null,
      },
      application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobApplication',
        default: null,
      },
      employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
    },

    // Reminder timing
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },

    triggerDate: {
      type: Date,
      default: () => new Date(),
    },

    // Status tracking
    status: {
      type: String,
      enum: ['pending', 'sent', 'viewed', 'snoozed', 'dismissed'],
      default: 'pending',
      index: true,
    },

    // Email notification tracking
    emailSent: {
      type: Boolean,
      default: false,
    },

    emailSentAt: {
      type: Date,
      default: null,
    },

    emailDeliveryError: {
      type: String,
      default: null,
    },

    // Viewed/Dismissed tracking
    viewedAt: {
      type: Date,
      default: null,
    },

    dismissedAt: {
      type: Date,
      default: null,
    },

    // Snooze feature
    snoozedUntil: {
      type: Date,
      default: null,
    },

    // Custom data for email templates
    templateData: {
      tags: {
        type: [String],
        enum: ['urgent', 'follow-up', 'info-only', 'action-required', 'confirmation'],
        default: [],
        index: true,
      },
      urgencyLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },
      title: String,
      message: String,
      applicantName: String,
      jobTitle: String,
      applicationId: String,
      companyName: String,
      contactName: String,
      email: String,
      registrationDate: String,
      reminders: [mongoose.Schema.Types.Mixed],
      // Allow other properties
    },

    // Is active reminder
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Priority level
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // For batch reminders
    batchId: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes for common queries
ReminderSchema.index({ user: 1, status: 1, isActive: 1 });
ReminderSchema.index({ user: 1, type: 1 });
ReminderSchema.index({ dueDate: 1, status: 1 });
ReminderSchema.index({ emailSent: 1, status: 1, dueDate: 1 });
ReminderSchema.index({ 'relatedEntity.job': 1 });
ReminderSchema.index({ 'relatedEntity.application': 1 });

module.exports = mongoose.model('Reminder', ReminderSchema);
