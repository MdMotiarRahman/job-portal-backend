const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    jobType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
      required: true,
    },

    salary: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      currency: { type: String, default: 'USD' },
    },

    requirements: {
      type: [String],
      default: [],
    },

    skills: {
      type: [String],
      required: true,
    },

    experienceLevel: {
      type: String,
      enum: ['Entry', 'Mid', 'Senior'],
      required: true,
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'closed'],
      default: 'active',
    },

    applications: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobApplication',
      },
    ],

    isApproved: {
      type: Boolean,
      default: false,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    approvalNotes: {
      type: String,
      default: '',
    },

    expiryDate: {
      type: Date,
      required: false,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      index: true,
    },

    applicationDeadline: {
      type: Date,
      required: false,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', JobSchema);
