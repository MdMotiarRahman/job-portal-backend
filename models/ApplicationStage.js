const mongoose = require('mongoose');

const ApplicationStageSchema = new mongoose.Schema(
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
    },
    stage: {
      type: String,
      enum: [
        'Applied',
        'Screening',
        'Reviewing',
        'Shortlisted',
        'Interview Scheduled',
        'Assessment',
        'Offer Extended',
        'Accepted',
        'Rejected',
        'Withdrawn',
      ],
      default: 'Applied',
      required: true,
    },
    previousStage: {
      type: String,
      enum: [
        'Applied',
        'Screening',
        'Reviewing',
        'Shortlisted',
        'Interview Scheduled',
        'Assessment',
        'Offer Extended',
        'Accepted',
        'Rejected',
        'Withdrawn',
      ],
    },
    movedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    movedByRole: {
      type: String,
      enum: ['admin', 'employer', 'system'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    interviewDate: Date,
    interviewTime: String,
    interviewMode: String,
    interviewLocation: String,
    offerDetails: {
      salary: Number,
      joiningDate: Date,
      notes: String,
    },
    rejectionReason: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

ApplicationStageSchema.index({ job: 1, stage: 1 });
ApplicationStageSchema.index({ employer: 1, stage: 1 });
ApplicationStageSchema.index({ application: 1, createdAt: -1 });

module.exports = mongoose.model('ApplicationStage', ApplicationStageSchema);
