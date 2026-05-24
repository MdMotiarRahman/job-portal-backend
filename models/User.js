const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 60,
    },

    role: {
      type: String,
      enum: ['admin', 'employer', 'seeker'],
      required: true,
    },

    phone: { type: String, default: '' },
    skills: { type: String, default: '' },
    education: { type: String, default: '' },
    experience: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    bio: { type: String, default: '' },
    location: { type: String, default: '' },
    profileImage: { type: String, default: '' },
    resume: { type: String, default: '' },

    // Admin Management Fields
    isActive: {
      type: Boolean,
      default: true,
    },

    isBanned: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    bannedAt: {
      type: Date,
      default: null,
    },

    bannedReason: {
      type: String,
      default: '',
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    permissions: {
      type: [String],
      default: [],
    },

    adminNotes: {
      type: String,
      default: '',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);