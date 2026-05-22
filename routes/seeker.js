const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

const {
  getMyProfile,
  updateMyProfile,
  applyJob,
  getMyApplications,
} = require('../controllers/seekerController');

router.get('/profile', authenticate, getMyProfile);

router.put(
  '/profile',
  authenticate,
  upload.single('profileImage'),
  updateMyProfile
);

router.post(
  '/apply',
  authenticate,
  upload.single('resume'),
  applyJob
);

router.get('/applications', authenticate, getMyApplications);

module.exports = router;