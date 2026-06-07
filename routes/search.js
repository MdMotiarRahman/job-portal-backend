const express = require('express');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const {
  searchApplications,
  getSavedViews,
  saveView,
  exportPipelineCSV,
  generateHiringReport,
  getEmployerCandidates,
} = require('../controllers/searchController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Search applications with filters
router.get('/applications', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, searchApplications);

// Get saved filter views
router.get('/views', getSavedViews);

// Save a filter view
router.post('/views', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, saveView);

// Export pipeline as CSV
router.get('/export/csv', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, exportPipelineCSV);

// Generate hiring report
router.post('/reports/hiring', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, generateHiringReport);

// Get employer's candidates
router.get('/candidates', requireRole('employer'), getEmployerCandidates);

module.exports = router;
