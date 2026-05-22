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

const SeekerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    fullName: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    location: { type: String, default: '', trim: true },
    skills: { type: String, default: '' },
    education: { type: String, default: '' },
    experience: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    bio: { type: String, default: '' },
    profileImage: { type: mediaSchema, default: () => ({}) },
    resume: { type: mediaSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SeekerProfile', SeekerProfileSchema);
