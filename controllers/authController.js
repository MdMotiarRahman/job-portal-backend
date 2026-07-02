const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SeekerProfile = require('../models/SeekerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const { createEmployerVerificationReminder } = require('../utils/reminderService');
const { uploadToCloudinary } = require('../utils/cloudinaryFiles');

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  const allowedRegistrationRoles = ['seeker', 'employer'];

  try {
    if (!allowedRegistrationRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid registration role' });
    }

    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = new User({
      name,
      email,
      password,
      role,
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    if (user.role === 'seeker') {
      await SeekerProfile.findOneAndUpdate(
        { user: user._id },
        {
          $setOnInsert: {
            user: user._id,
            fullName: user.name || '',
          },
        },
        { upsert: true }
      );
    } else if (user.role === 'employer') {
      await EmployerProfile.findOneAndUpdate(
        { user: user._id },
        {
          $setOnInsert: {
            user: user._id,
            companyName: user.name || user.email,
            verificationStatus: 'pending',
          },
        },
        { upsert: true }
      );

      const admins = await User.find({ role: 'admin' });

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await createEmployerVerificationReminder(admin._id, {
            employerId: user._id,
            companyName: user.name || 'New Company',
            contactName: user.name,
            email: user.email,
          });
        }

        console.log(
          `Employer verification reminders queued for ${admins.length} admin(s)`
        );
      }
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
      role: user.role,
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 3600 },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(423).json({
        message: 'Account temporarily locked due to multiple failed login attempts. Try again later.',
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        message: 'Your account has been banned',
        reason: user.bannedReason,
      });
    }

    if (!user.isActive && user.role !== 'admin') {
      return res.status(403).json({
        message: 'Your account is currently inactive. Please contact support.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await user.save();
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    user.loginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = new Date();
    await user.save();

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
      role: user.role,
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 3600 },
      async (err, token) => {
        if (err) throw err;

        const responseData = {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };

        if (user.role === 'employer') {
          const employerProfile = await EmployerProfile.findOne({ user: user._id });
          if (employerProfile) {
            responseData.verificationStatus = employerProfile.verificationStatus;
            responseData.rejectionReason = employerProfile.rejectionReason;
          }
        }

        res.json(responseData);
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.me = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Not authorized' });

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isBanned: user.isBanned,
        isVerified: user.isVerified,
        lastLogin: user.lastLogin,
        phone: user.phone,
        location: user.location,
        profileImage: user.profileImage || '',
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const { name, phone, location, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;

    // Handle profile image upload
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file, {
          folder: 'jobland/admin/profile',
          transformation: [{ width: 300, height: 300, crop: 'fill' }],
        });
        user.profileImage = result.secure_url || result.url;
      } catch (uploadErr) {
        console.error('Cloudinary upload failed, using local fallback:', uploadErr.message);
        user.profileImage = `/uploads/${req.file.filename}`;
      }
    }

    if (newPassword && currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid current password' });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        profileImage: user.profileImage || '',
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
