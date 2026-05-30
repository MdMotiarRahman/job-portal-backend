const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');
const {
  // Dashboard
  getDashboardStats,
  // User Management
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  // User Status
  activateUser,
  deactivateUser,
  banUser,
  unbanUser,
  verifyUser,
  // Job Management
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  approveJob,
  rejectJob,
  closeJob,
  reopenJob,
  deleteJob,
  // Job Applications
  getAllApplications,
  updateApplicationStatus,
  // Employer Verification
  getAllEmployers,
  getEmployerById,
  approveEmployer,
  rejectEmployer,
  getPendingEmployers,
  // Analytics
  getAnalytics,
} = require('../controllers/adminController');

// ============ MIDDLEWARE ============
// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

// ============ DASHBOARD ============
// @route   GET /api/admin/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard/stats', getDashboardStats);

// @route   GET /api/admin/analytics
// @desc    Get detailed analytics
// @access  Private (Admin only)
router.get('/analytics', getAnalytics);

// ============ USER MANAGEMENT ============
// @route   GET /api/admin/users
// @desc    Get all users with filters
// @access  Private (Admin only)
router.get('/users', getAllUsers);

// @route   GET /api/admin/users/:id
// @desc    Get user by ID
// @access  Private (Admin only)
router.get('/users/:id', getUserById);

// @route   POST /api/admin/users
// @desc    Create new user
// @access  Private (Admin only)
router.post('/users', createUser);

// @route   PUT /api/admin/users/:id
// @desc    Update user information
// @access  Private (Admin only)
router.put('/users/:id', updateUser);

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/users/:id', deleteUser);

// ============ USER STATUS MANAGEMENT ============
// @route   PUT /api/admin/users/:id/activate
// @desc    Activate a user
// @access  Private (Admin only)
router.put('/users/:id/activate', activateUser);

// @route   PUT /api/admin/users/:id/deactivate
// @desc    Deactivate a user
// @access  Private (Admin only)
router.put('/users/:id/deactivate', deactivateUser);

// @route   PUT /api/admin/users/:id/ban
// @desc    Ban a user with reason
// @access  Private (Admin only)
router.put('/users/:id/ban', banUser);

// @route   PUT /api/admin/users/:id/unban
// @desc    Unban a user
// @access  Private (Admin only)
router.put('/users/:id/unban', unbanUser);

// @route   PUT /api/admin/users/:id/verify
// @desc    Verify a user
// @access  Private (Admin only)
router.put('/users/:id/verify', verifyUser);

// ============ JOB MANAGEMENT ============
// @route   GET /api/admin/jobs
// @desc    Get all jobs with filters
// @access  Private (Admin only)
router.get('/jobs', getAllJobs);

// @route   GET /api/admin/jobs/:id
// @desc    Get job by ID
// @access  Private (Admin only)
router.get('/jobs/:id', getJobById);

// @route   POST /api/admin/jobs
// @desc    Create a job posting
// @access  Private (Admin only)
router.post('/jobs', createJob);

// @route   PUT /api/admin/jobs/:id
// @desc    Update a job posting
// @access  Private (Admin only)
router.put('/jobs/:id', updateJob);

// @route   PUT /api/admin/jobs/:id/approve
// @desc    Approve a job posting
// @access  Private (Admin only)
router.put('/jobs/:id/approve', approveJob);

// @route   PUT /api/admin/jobs/:id/reject
// @desc    Reject a job posting
// @access  Private (Admin only)
router.put('/jobs/:id/reject', rejectJob);

// @route   PUT /api/admin/jobs/:id/close
// @desc    Close a job posting
// @access  Private (Admin only)
router.put('/jobs/:id/close', closeJob);

// @route   PUT /api/admin/jobs/:id/reopen
// @desc    Reopen a closed job posting
// @access  Private (Admin only)
router.put('/jobs/:id/reopen', reopenJob);

// @route   DELETE /api/admin/jobs/:id
// @desc    Delete a job posting
// @access  Private (Admin only)
router.delete('/jobs/:id', deleteJob);

// ============ JOB APPLICATIONS ============
// @route   GET /api/admin/applications
// @desc    Get all job applications
// @access  Private (Admin only)
router.get('/applications', getAllApplications);

// @route   PUT /api/admin/applications/:id/status
// @desc    Update application status
// @access  Private (Admin only)
router.put('/applications/:id/status', updateApplicationStatus);

// ============ EMPLOYER VERIFICATION ============
// @route   GET /api/admin/employers
// @desc    Get all employers with verification status
// @access  Private (Admin only)
router.get('/employers', getAllEmployers);

// @route   GET /api/admin/employers/pending
// @desc    Get pending employers for verification
// @access  Private (Admin only)
router.get('/employers/pending', getPendingEmployers);

// @route   GET /api/admin/employers/:id
// @desc    Get employer details
// @access  Private (Admin only)
router.get('/employers/:id', getEmployerById);

// @route   PUT /api/admin/employers/:id/approve
// @desc    Approve employer verification
// @access  Private (Admin only)
router.put('/employers/:id/approve', approveEmployer);

// @route   PUT /api/admin/employers/:id/reject
// @desc    Reject employer verification
// @access  Private (Admin only)
router.put('/employers/:id/reject', rejectEmployer);

module.exports = router;
