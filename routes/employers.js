const express = require('express');
const router = express.Router();
const User = require('../models/User');
const EmployerProfile = require('../models/EmployerProfile');

// @route   GET /api/employers
// @desc    Get all verified employers (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const users = await User.find({ role: 'employer', isActive: true })
      .select('name email createdAt')
      .lean();

    const userIds = users.map(u => u._id);

    const profiles = await EmployerProfile.find({
      user: { $in: userIds },
    })
      .lean();

    const profileMap = {};
    profiles.forEach(p => { profileMap[p.user.toString()] = p; });

    const employers = users
      .filter(u => profileMap[u._id.toString()])
      .map(u => ({
        ...u,
        profile: profileMap[u._id.toString()],
      }))
      .slice(skip, skip + Number(limit));

    const total = users.filter(u => profileMap[u._id.toString()]).length;

    res.json({
      data: {
        employers,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      },
    });
  } catch (err) {
    console.error('Public employers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/employers/:id
// @desc    Get single employer by ID (public)
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name email role createdAt')
      .lean();

    if (!user || user.role !== 'employer') {
      return res.status(404).json({ message: 'Employer not found' });
    }

    const profile = await EmployerProfile.findOne({ user: user._id }).lean();

    res.json({
      data: {
        employer: { ...user, profile },
      },
    });
  } catch (err) {
    console.error('Public employer detail error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
