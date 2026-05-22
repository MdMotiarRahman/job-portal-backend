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
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);