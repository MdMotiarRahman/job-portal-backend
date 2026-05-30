const express = require('express');
const authenticate = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');
const {
  closeJob,
  createJob,
  deleteJob,
  getApplications,
  getEmployerSummary,
  getMyJobs,
  reopenJob,
  updateApplication,
  updateJob,
} = require('../controllers/employerController');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('employer'));

router.get('/summary', getEmployerSummary);

router.get('/jobs', getMyJobs);
router.post('/jobs', createJob);
router.put('/jobs/:id', updateJob);
router.delete('/jobs/:id', deleteJob);
router.put('/jobs/:id/close', closeJob);
router.put('/jobs/:id/reopen', reopenJob);

router.get('/applications', getApplications);
router.get('/applications/:jobId', getApplications);
router.put('/applications/:id', updateApplication);

module.exports = router;
