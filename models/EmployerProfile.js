const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    resourceType: { type: String, default: '' },
    format: { type: String, default: '' },
    bytes: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: null },
  },
  { _id: false }
);

const EmployerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    companyWebsite: {
      type: String,
      default: '',
    },

    companyDescription: {
      type: String,
      default: '',
    },

    companySize: {
      type: String,
      enum: ['1-50', '51-200', '201-500', '501-1000', '1000+'],
      default: '1-50',
    },

    industry: {
      type: String,
      default: '',
    },

    location: {
      type: String,
      default: '',
    },

    phone: {
      type: String,
      default: '',
      trim: true,
    },

    logo: { type: mediaSchema, default: () => ({}) },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },

    verificationDocument: {
      type: mediaSchema,
      default: () => ({}),
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      default: '',
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    adminNotes: {
      type: String,
      default: '',
    },

    totalJobs: {
      type: Number,
      default: 0,
    },

    totalApplications: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmployerProfile', EmployerProfileSchema);
