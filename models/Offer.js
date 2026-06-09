const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema(
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

    // Offer Details
    position: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    
    // Compensation
    salary: {
      type: Number,
      required: true,
      // Annual salary in currency
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'],
    },
    frequency: {
      type: String,
      default: 'annual',
      enum: ['hourly', 'monthly', 'annual'],
    },
    
    // Benefits
    benefits: {
      type: String,
      maxlength: 2000,
      // Benefits summary/description
    },
    
    // Employment Terms
    joiningDate: {
      type: Date,
      required: true,
    },
    employmentType: {
      type: String,
      default: 'Full-Time',
      enum: ['Full-Time', 'Part-Time', 'Contract', 'Temporary', 'Freelance'],
    },
    reportingTo: {
      type: String,
      trim: true,
    },
    terms: {
      type: String,
      maxlength: 3000,
      // Terms & conditions
    },
    
    // Status & Timeline
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'withdrawn'],
      default: 'draft',
    },
    expiryDate: Date,
    sentAt: Date,
    viewedAt: Date,
    respondedAt: Date,
    rejectionReason: String,
    
    // Notes
    notes: {
      type: String,
      maxlength: 1000,
      // Internal notes from employer
    },
    candidateNotes: {
      type: String,
      maxlength: 1000,
      // Candidate's response/notes
    },
    
    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    withdrawnBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    withdrawReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
OfferSchema.index({ application: 1, status: 1 });
OfferSchema.index({ seeker: 1, status: 1 });
OfferSchema.index({ employer: 1, status: 1 });
OfferSchema.index({ job: 1, status: 1 });
OfferSchema.index({ expiryDate: 1 });
OfferSchema.index({ sentAt: 1 });

module.exports = mongoose.model('Offer', OfferSchema);
