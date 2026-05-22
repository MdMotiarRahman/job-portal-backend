const mongoose = require('mongoose');

const JobApplicationSchema = new mongoose.Schema(
  {
    seeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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