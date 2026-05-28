const express = require('express');

const router = express.Router();

const {
  verifyToken,
  isSeeker
} = require('../middleware/authMiddleware');

const upload =
require('../middleware/upload');

const seekerController =
require('../controllers/seekerController');

const {
  getMyProfile,
  updateMyProfile,
  applyJob,
  getMyApplications,
} = seekerController;


// GET PROFILE
router.get(
  '/profile',
  verifyToken,
  getMyProfile
);


// UPDATE PROFILE
router.put(
  '/profile',
  verifyToken,
  upload.single('profileImage'),
  updateMyProfile
);


// APPLY JOB
router.post(
  '/apply/:jobId',
  verifyToken,
  isSeeker,
  upload.single('resume'),
  applyJob
);


// GET APPLICATIONS
router.get(
  '/applications',
  verifyToken,
  getMyApplications
);

module.exports = router;