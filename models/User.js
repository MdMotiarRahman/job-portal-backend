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
      // bcrypt hash will be stored here (no need to validate length at schema-level)
      minlength: 60,
    },

    role: {
      type: String,
      enum: ['admin', 'employer', 'seeker'],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
