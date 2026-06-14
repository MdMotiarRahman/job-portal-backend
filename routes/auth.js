const express = require('express');
const router = express.Router();
const { register, login, me, updateMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', register);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', login);

// @route   GET api/auth/me
// @desc    Get current authenticated user
// @access  Private
router.get('/me', authenticate, me);

// @route   PUT api/auth/me
// @desc    Update current authenticated user
// @access  Private
router.put('/me', authenticate, upload.single('profileImage'), updateMe);

module.exports = router;
