const mongoose = require('mongoose');

const JobApplicationSchema = new mongoose.Schema(
  {
    seeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      default: null,
    },

    jobTitle: String,

    coverLetter: String,

    resume: String,

    status: {
      type: String,
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'JobApplication',
  JobApplicationSchema
);
