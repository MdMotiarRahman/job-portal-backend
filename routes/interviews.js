const express = require('express');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const {
  scheduleInterview,
  getInterviewDetails,
  updateInterview,
  cancelInterview,
  sendInterviewNotification,
  getEmployerInterviews,
  getCandidateInterviews,
} = require('../controllers/interviewController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Schedule interview (admin, employer)
router.post('/', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, scheduleInterview);

// Get interview details (admin, employer, seeker of the application)
router.get('/:applicationId', getInterviewDetails);

// Update interview (employer, admin)
router.put('/:interviewId', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, updateInterview);

// Cancel interview (employer, admin)
router.delete('/:interviewId', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, cancelInterview);

// Send interview notification (employer, admin)
router.post('/:interviewId/send-notification', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, sendInterviewNotification);

// Get employer's interviews (employer, admin)
router.get('/my/list', (req, res, next) => {
  if (req.user.role === 'employer') {
    return getEmployerInterviews(req, res);
  }
  return res.status(403).json({ success: false, message: 'Access denied.' });
});

// Get candidate's interviews (seeker)
router.get('/my/applications', (req, res, next) => {
  if (req.user.role === 'seeker') {
    return getCandidateInterviews(req, res);
  }
  return res.status(403).json({ success: false, message: 'Access denied.' });
});

module.exports = router;
