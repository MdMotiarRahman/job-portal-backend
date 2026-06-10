const express = require('express');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const {
  closeJob,
  createJob,
  deleteJob,
  getApplications,
  getEmployerProfile,
  getEmployerSummary,
  getMyJobs,
  reopenJob,
  updateApplication,
  updateEmployerProfile,
  updateJob,
} = require('../controllers/employerController');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('employer'));

router.get('/summary', getEmployerSummary);

router.get('/profile', getEmployerProfile);
router.put('/profile', upload.fields([{ name: 'companyLogo', maxCount: 1 }]), updateEmployerProfile);

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
