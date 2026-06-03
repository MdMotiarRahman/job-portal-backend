/**
 * Reminder Controller
 * Handles reminder CRUD operations and user interactions
 */

const reminderService = require('../utils/reminderService');
const Reminder = require('../models/Reminder');

/**
 * @route   GET /api/reminders
 * @desc    Get all reminders for current user
 * @access  Private
 */
exports.getReminders = async (req, res) => {
  try {
    const { status, type, priority, page = 1, limit = 10 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (priority) filters.priority = priority;
    filters.page = parseInt(page);
    filters.limit = parseInt(limit);

    const result = await reminderService.getRemindersForUser(
      req.user.id,
      filters
    );

    res.json({
      success: true,
      data: {
        reminders: result.reminders,
        pagination: result.pagination,
        unviewedCount: result.unviewedCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reminders',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/reminders/stats
 * @desc    Get reminder statistics for current user
 * @access  Private
 */
exports.getReminderStats = async (req, res) => {
  try {
    const stats = await reminderService.getReminderStats(req.user.id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reminder statistics',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/reminders
 * @desc    Create a new reminder
 * @access  Private (Admin/System)
 */
exports.createReminder = async (req, res) => {
  try {
    const {
      userId,
      type,
      title,
      description,
      dueDate,
      priority = 'medium',
      relatedEntity = {},
      templateData = {},
    } = req.body;

    // Validation
    if (!userId || !type || !title || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, type, title, dueDate',
      });
    }

    // Validate type
    const validTypes = [
      'new_application',
      'interview_scheduled',
      'application_status_update',
      'job_deadline',
      'job_expiring',
      'pending_applications',
      'verification_pending',
      'application_follow_up',
      'job_matches',
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reminder type. Valid types: ${validTypes.join(', ')}`,
      });
    }

    const reminderData = {
      user: userId,
      type,
      title,
      description,
      dueDate: new Date(dueDate),
      priority,
      relatedEntity,
      templateData,
    };

    const reminder = await reminderService.createReminder(reminderData);

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      data: reminder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating reminder',
      error: error.message,
    });
  }
};

/**
 * @route   PUT /api/reminders/:id/view
 * @desc    Mark reminder as viewed
 * @access  Private
 */
exports.markAsViewed = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    if (reminder.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this reminder',
      });
    }

    const updated = await reminderService.markAsViewed(id);

    res.json({
      success: true,
      message: 'Reminder marked as viewed',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking reminder as viewed',
      error: error.message,
    });
  }
};

/**
 * @route   PUT /api/reminders/:id/snooze
 * @desc    Snooze reminder for specified minutes
 * @access  Private
 */
exports.snoozeReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { minutes = 30 } = req.body;

    // Verify ownership
    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    if (reminder.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to snooze this reminder',
      });
    }

    const updated = await reminderService.snoozeReminder(id, minutes);

    res.json({
      success: true,
      message: `Reminder snoozed for ${minutes} minutes`,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error snoozing reminder',
      error: error.message,
    });
  }
};

/**
 * @route   DELETE /api/reminders/:id
 * @desc    Delete/dismiss a reminder
 * @access  Private
 */
exports.dismissReminder = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    if (reminder.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to dismiss this reminder',
      });
    }

    const updated = await reminderService.dismissReminder(id);

    res.json({
      success: true,
      message: 'Reminder dismissed',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error dismissing reminder',
      error: error.message,
    });
  }
};

/**
 * @route   PUT /api/reminders/mark-all/viewed
 * @desc    Mark all reminders as viewed for current user
 * @access  Private
 */
exports.markAllAsViewed = async (req, res) => {
  try {
    const { reminderIds = null } = req.body;

    const result = await reminderService.markAllAsViewed(
      req.user.id,
      reminderIds
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} reminder(s) marked as viewed`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking reminders as viewed',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/reminders/:id
 * @desc    Get single reminder details
 * @access  Private
 */
exports.getReminder = async (req, res) => {
  try {
    const { id } = req.params;

    const reminder = await Reminder.findById(id)
      .populate('user', 'name email role')
      .populate('relatedEntity.job', 'title company location')
      .populate('relatedEntity.application', 'jobTitle status')
      .populate('relatedEntity.employer', 'name');

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found',
      });
    }

    // Check ownership
    if (reminder.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this reminder',
      });
    }

    res.json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reminder',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/reminders/manual-send
 * @desc    Manually trigger sending pending reminders (Admin only)
 * @access  Private (Admin)
 */
exports.manualSendPendingReminders = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can trigger manual reminder sending',
      });
    }

    const result = await reminderService.sendPendingReminders();

    res.json({
      success: true,
      message: 'Manual reminder send triggered',
      data: {
        sent: result.sent,
        failed: result.failed,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending reminders',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/reminders/cleanup
 * @desc    Manually trigger cleanup of old reminders (Admin only)
 * @access  Private (Admin)
 */
exports.manualCleanup = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can trigger reminder cleanup',
      });
    }

    const result = await reminderService.cleanupOldReminders();

    res.json({
      success: true,
      message: 'Cleanup triggered',
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error during cleanup',
      error: error.message,
    });
  }
};
