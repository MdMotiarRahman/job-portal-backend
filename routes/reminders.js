const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const authenticate = require('../middleware/authMiddleware');

// ============ PROTECTED ROUTES (Require Authentication) ============

// Get all reminders for current user
router.get('/', authenticate, reminderController.getReminders);

// Get reminder statistics
router.get('/stats', authenticate, reminderController.getReminderStats);

// Get single reminder
router.get('/:id', authenticate, reminderController.getReminder);

// Mark reminder as viewed
router.put('/:id/view', authenticate, reminderController.markAsViewed);

// Snooze reminder
router.put('/:id/snooze', authenticate, reminderController.snoozeReminder);

// Dismiss/Delete reminder
router.delete('/:id', authenticate, reminderController.dismissReminder);

// Mark all reminders as viewed
router.put('/mark-all/viewed', authenticate, reminderController.markAllAsViewed);

// ============ ADMIN-ONLY ROUTES ============

// Create reminder (Admin/System)
router.post('/', authenticate, reminderController.createReminder);

// Manually send pending reminders (Admin only)
router.post('/manual-send/pending', authenticate, reminderController.manualSendPendingReminders);

// Manually cleanup old reminders (Admin only)
router.post('/manual-cleanup/old', authenticate, reminderController.manualCleanup);

module.exports = router;
