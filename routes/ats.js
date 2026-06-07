const express = require('express');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const {
  getPipelineStats,
  getPipelineBoard,
  moveApplicationStage,
  bulkMoveApplications,
  getStageHistory,
  getEmployerATSStats,
} = require('../controllers/atsController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Pipeline Board — Admin sees all, Employer sees their own
router.get('/board', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, getPipelineBoard);

// Pipeline Stats
router.get('/stats', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, getPipelineStats);

// Employer-specific ATS stats
router.get('/employer-stats', requireRole('employer'), getEmployerATSStats);

// Move single application
router.put('/applications/:applicationId/move', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, moveApplicationStage);

// Bulk move
router.post('/applications/bulk-move', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, bulkMoveApplications);

// Stage history for a single application
router.get('/applications/:applicationId/history', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, getStageHistory);

module.exports = router;
