const mongoose = require("mongoose");

const JobApplicationSchema = new mongoose.Schema(
  {

    seeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    coverLetter: {
      type: String,
    },

    resume: {
      type: String,
    },

    status: {
  type: String,
  enum: [
    "Pending",
    "Reviewing",
    "Shortlisted",
    "Interview Scheduled",
    "Accepted",
    "Rejected"
  ],
  default: "Pending",
},

interviewDate: {
  type: String,
},

interviewTime: {
  type: String,
},

interviewMode: {
  type: String,
},

employerMessage: {
  type: String,
},

  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "JobApplication",
  JobApplicationSchema
);