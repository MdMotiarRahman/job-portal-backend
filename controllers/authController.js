const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SeekerProfile = require('../models/SeekerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const { createEmployerVerificationReminder } = require('../utils/reminderService');

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
      // Create employer profile with pending verification status
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

      // ========== 🎯 REMINDER INTEGRATION ==========
      // Create reminder for admin - notify about pending employer verification
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
          `📧 Employer verification reminders queued for ${admins.length} admin(s)`
        );
      }
      // ===============================================
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

    // Check if account is locked due to multiple failed attempts
    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(423).json({
        message: 'Account temporarily locked due to multiple failed login attempts. Try again later.',
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({
        message: 'Your account has been banned',
        reason: user.bannedReason,
      });
    }

    // Check if user is active (except for admins)
    if (!user.isActive && user.role !== 'admin') {
      return res.status(403).json({
        message: 'Your account is currently inactive. Please contact support.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      // Lock account after 5 failed attempts
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      }

      await user.save();
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
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

        // Prepare response data
        const responseData = {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };

        // For employers, include verification status
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
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
