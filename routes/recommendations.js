const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const {
  getRecommendedJobs,
  getCandidates,
  getJobCandidates,
} = require('../controllers/recommendationController');

// Seeker: get job recommendations
router.get('/jobs', authenticate, requireRole('seeker'), getRecommendedJobs);

// Employer: get fit scores for all applications
router.get('/candidates', authenticate, requireRole('employer'), getCandidates);

// Employer: get ranked candidates for a specific job
router.get('/candidates/:jobId', authenticate, requireRole('employer'), getJobCandidates);

module.exports = router;
