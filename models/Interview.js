const mongoose = require('mongoose');

const InterviewSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobApplication',
      required: true,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    seeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Interview Details
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
      // Format: HH:mm (24-hour)
    },
    mode: {
      type: String,
      enum: ['Video', 'In-Person', 'Phone', 'Hybrid'],
      default: 'Video',
    },
    location: {
      type: String,
      trim: true,
      // Required if mode is In-Person or Hybrid
    },
    duration: {
      type: Number,
      // Duration in minutes, default 60
      default: 60,
    },
    
    // Interview Panel
    panelMembers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        email: String,
        name: String,
        role: String,
        attended: {
          type: Boolean,
          default: false,
        },
        feedback: String,
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
      },
    ],
    
    // Interview Content
    topics: {
      type: String,
      maxlength: 2000,
      // Topics/questions to cover during interview
    },
    preparationMaterials: {
      type: String,
      maxlength: 1000,
      // Links or descriptions of materials to share
    },
    meetingLink: {
      type: String,
      // Zoom/Teams/Google Meet link for video interviews
    },
    
    // Interview Status & Feedback
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
    overallRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    
    // Notifications
    reminderSentAt: Date,
    notificationSentAt: Date,
    
    // Scheduling Info
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelReason: String,
  },
  {
    timestamps: true,
  }
);

// Index for querying interviews by candidate or employer
InterviewSchema.index({ application: 1, date: 1 });
InterviewSchema.index({ seeker: 1, date: 1 });
InterviewSchema.index({ employer: 1, date: 1 });
InterviewSchema.index({ job: 1, date: 1 });
InterviewSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model('Interview', InterviewSchema);
