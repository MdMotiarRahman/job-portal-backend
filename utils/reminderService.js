/**
 * Reminder Service
 * Core business logic for reminder operations and email notifications
 */

const Reminder = require('../models/Reminder');
const { sendEmail } = require('./emailService');
const cron = require('node-cron');
const webpush = require('web-push');

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

const isProbablyValidVapidKey = (key) => {
  if (!key) return false;

  // web-push expects URL-safe base64. Placeholder strings should be rejected.
  const trimmed = String(key).trim();
  if (
    trimmed.length === 0 ||
    trimmed.includes('YOUR_PUBLIC_VAPID_KEY') ||
    trimmed.includes('YOUR_PRIVATE_VAPID_KEY')
  ) {
    return false;
  }

  // For base64url keys, 65-byte public keys encode to ~87 chars.
  // We use a len check as a fast pre-validation to avoid startup crashes.
  return trimmed.length >= 80 && trimmed.length <= 120;
};

const canUseWebPush =
  isProbablyValidVapidKey(vapidKeys.publicKey) &&
  isProbablyValidVapidKey(vapidKeys.privateKey);

if (canUseWebPush) {
  webpush.setVapidDetails(
    'mailto:support@jobportal.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} else {
  console.warn(
    '⚠️ WebPush/VAPID not configured or invalid. Push notifications will be disabled until VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set correctly.'
  );
}

const sendPushNotification = async (user, payload) => {
  if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) return;

  const notifications = user.pushSubscriptions.map(sub => 
    webpush.sendNotification(sub, JSON.stringify(payload)).catch(err => {
      console.error('Error sending push notification:', err);
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expired
        user.pushSubscriptions = user.pushSubscriptions.filter(s => s.endpoint !== sub.endpoint);
        return user.save();
      }
    })
  );

  await Promise.all(notifications);
};

/**
 * Create a new reminder
 * @param {object} reminderData - Reminder data
 * @returns {object} Created reminder
 */
const createReminder = async (reminderData) => {
  try {
    const reminder = new Reminder(reminderData);
    await reminder.save();
    console.log(`✅ Reminder created: ${reminder.type} for user ${reminder.user}`);
    return reminder;
  } catch (error) {
    console.error('❌ Error creating reminder:', error.message);
    throw error;
  }
};

/**
 * Get reminders for a user
 * @param {string} userId - User ID
 * @param {object} filters - Filter options
 * @returns {array} Reminders
 */
const getRemindersForUser = async (userId, filters = {}) => {
  try {
    const query = { user: userId, isActive: true };

    // Add status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Add type filter
    if (filters.type) {
      query.type = filters.type;
    }

    // Add priority filter
    if (filters.priority) {
      query.priority = filters.priority;
    }

    // Get unviewed/pending reminders count
    const totalCount = await Reminder.countDocuments(query);
    const unviewedCount = await Reminder.countDocuments({
      ...query,
      status: { $in: ['pending', 'sent'] },
    });

    // Fetch reminders with pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const reminders = await Reminder.find(query)
      .sort({ dueDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email role')
      .populate('relatedEntity.job', 'title')
      .populate('relatedEntity.application', 'jobTitle status')
      .populate('relatedEntity.employer', 'name email');

    return {
      reminders,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
      unviewedCount,
    };
  } catch (error) {
    console.error('❌ Error fetching reminders:', error.message);
    throw error;
  }
};

/**
 * Mark reminder as viewed
 * @param {string} reminderId - Reminder ID
 * @returns {object} Updated reminder
 */
const markAsViewed = async (reminderId) => {
  try {
    const reminder = await Reminder.findByIdAndUpdate(
      reminderId,
      {
        status: 'viewed',
        viewedAt: new Date(),
      },
      { new: true }
    );

    if (!reminder) {
      throw new Error('Reminder not found');
    }

    console.log(`✅ Reminder marked as viewed: ${reminderId}`);
    return reminder;
  } catch (error) {
    console.error('❌ Error marking reminder as viewed:', error.message);
    throw error;
  }
};

/**
 * Snooze a reminder
 * @param {string} reminderId - Reminder ID
 * @param {number} minutes - Minutes to snooze
 * @returns {object} Updated reminder
 */
const snoozeReminder = async (reminderId, minutes = 30) => {
  try {
    const snoozedUntil = new Date(Date.now() + minutes * 60000);

    const reminder = await Reminder.findByIdAndUpdate(
      reminderId,
      {
        status: 'snoozed',
        snoozedUntil,
      },
      { new: true }
    );

    if (!reminder) {
      throw new Error('Reminder not found');
    }

    console.log(`✅ Reminder snoozed until ${snoozedUntil}`);
    return reminder;
  } catch (error) {
    console.error('❌ Error snoozing reminder:', error.message);
    throw error;
  }
};

/**
 * Delete/dismiss a reminder
 * @param {string} reminderId - Reminder ID
 * @returns {object} Updated reminder
 */
const dismissReminder = async (reminderId) => {
  try {
    const reminder = await Reminder.findByIdAndUpdate(
      reminderId,
      {
        status: 'dismissed',
        dismissedAt: new Date(),
        isActive: false,
      },
      { new: true }
    );

    if (!reminder) {
      throw new Error('Reminder not found');
    }

    console.log(`✅ Reminder dismissed: ${reminderId}`);
    return reminder;
  } catch (error) {
    console.error('❌ Error dismissing reminder:', error.message);
    throw error;
  }
};

/**
 * Get reminder statistics for user
 * @param {string} userId - User ID
 * @returns {object} Statistics
 */
const getReminderStats = async (userId) => {
  try {
    const stats = {
      total: await Reminder.countDocuments({
        user: userId,
        isActive: true,
      }),
      pending: await Reminder.countDocuments({
        user: userId,
        status: 'pending',
        isActive: true,
      }),
      unviewed: await Reminder.countDocuments({
        user: userId,
        status: { $in: ['pending', 'sent'] },
        isActive: true,
      }),
      viewed: await Reminder.countDocuments({
        user: userId,
        status: 'viewed',
        isActive: true,
      }),
      byType: {},
      byPriority: {},
    };

    // Count by type
    const byType = await Reminder.aggregate([
      {
        $match: {
          user: userId,
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    byType.forEach((item) => {
      stats.byType[item._id] = item.count;
    });

    // Count by priority
    const byPriority = await Reminder.aggregate([
      {
        $match: {
          user: userId,
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ]);

    byPriority.forEach((item) => {
      stats.byPriority[item._id] = item.count;
    });

    return stats;
  } catch (error) {
    console.error('❌ Error getting reminder stats:', error.message);
    throw error;
  }
};

/**
 * Send pending reminders (Scheduled task - runs every hour)
 * Sends email notifications for reminders that are due
 */
const sendPendingReminders = async () => {
  try {
    console.log('🔄 Checking for reminders to send...');

    // Find reminders that are:
    // 1. In pending or sent status
    // 2. Due date is now or in the past
    // 3. Email not sent yet
    const now = new Date();

    const pendingReminders = await Reminder.find({
      status: { $in: ['pending', 'sent'] },
      dueDate: { $lte: now },
      emailSent: false,
      isActive: true,
    })
      .populate('user', 'name email role')
      .populate('relatedEntity.job', 'title')
      .populate('relatedEntity.application', 'jobTitle')
      .populate('relatedEntity.employer', 'name');

    if (pendingReminders.length === 0) {
      console.log('✅ No pending reminders to send');
      return { sent: 0, failed: 0 };
    }

    console.log(
      `📧 Found ${pendingReminders.length} reminders to send. Starting email delivery...`
    );

    let sent = 0;
    let failed = 0;

    for (const reminder of pendingReminders) {
      try {
        // Send email
        const result = await sendEmail(
          reminder.user.email,
          reminder.title,
          `reminder${reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1).replace(/_/g, '')}`,
          reminder.templateData
        );

        if (result.success) {
          // Send Web Push Notification
          await sendPushNotification(reminder.user, {
            title: reminder.title,
            body: reminder.description,
            url: reminder.templateData?.applicationLink || reminder.templateData?.jobLink || '/',
          });

          // Update reminder as sent
          reminder.status = 'sent';
          reminder.emailSent = true;
          reminder.emailSentAt = new Date();
          await reminder.save();
          sent++;
          console.log(`✅ Email sent for reminder: ${reminder._id}`);
        } else {
          // Log error but don't fail
          reminder.emailDeliveryError = result.error;
          await reminder.save();
          failed++;
          console.error(`❌ Failed to send email for reminder ${reminder._id}: ${result.error}`);
        }
      } catch (error) {
        failed++;
        console.error(`❌ Error processing reminder ${reminder._id}:`, error.message);
      }
    }

    console.log(
      `📊 Reminder email delivery complete: ${sent} sent, ${failed} failed`
    );

    return { sent, failed };
  } catch (error) {
    console.error('❌ Error in sendPendingReminders:', error.message);
    return { sent: 0, failed: 0 };
  }
};

/**
 * Process snoozed reminders (Scheduled task - runs every 5 minutes)
 * Reactivates snoozed reminders when snooze time expires
 */
const processSnoozedReminders = async () => {
  try {
    const now = new Date();

    const reactivated = await Reminder.updateMany(
      {
        status: 'snoozed',
        snoozedUntil: { $lte: now },
      },
      {
        status: 'pending',
        snoozedUntil: null,
      }
    );

    if (reactivated.modifiedCount > 0) {
      console.log(`✅ Reactivated ${reactivated.modifiedCount} snoozed reminders`);
    }

    return reactivated;
  } catch (error) {
    console.error('❌ Error processing snoozed reminders:', error.message);
  }
};

/**
 * Clean up old dismissed reminders (Scheduled task - runs daily)
 * Removes dismissed/inactive reminders older than 30 days
 */
const cleanupOldReminders = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const deleted = await Reminder.deleteMany({
      $or: [
        {
          status: 'dismissed',
          dismissedAt: { $lt: thirtyDaysAgo },
        },
        {
          isActive: false,
          updatedAt: { $lt: thirtyDaysAgo },
        },
      ],
    });

    if (deleted.deletedCount > 0) {
      console.log(`✅ Cleaned up ${deleted.deletedCount} old reminders`);
    }

    return deleted;
  } catch (error) {
    console.error('❌ Error cleaning up old reminders:', error.message);
  }
};

// Create a digest combining multiple reminders
const createDigest = async (userId, reminders, frequencyType) => {
  try {
    const digest = new Reminder({
      user: userId,
      type: `digest-${frequencyType}`,
      title: `Your ${frequencyType.toUpperCase()} Digest`,
      description: `${reminders.length} reminders for ${frequencyType} digest`,
      dueDate: new Date(),
      status: 'pending',
      templateData: {
        title: `Your ${frequencyType.toUpperCase()} Digest`,
        message: `You have ${reminders.length} reminders`,
        reminders: reminders.map(r => ({
          type: r.type,
          title: r.templateData?.title || r.title,
          message: r.templateData?.message || r.description,
          createdAt: r.createdAt,
        })),
      },
    });

    await digest.save();
    console.log(`✉️ Digest created for user ${userId}: ${reminders.length} reminders`);
    return digest;
  } catch (error) {
    console.error('Error creating digest:', error);
  }
};

// Send daily digest emails
const sendDailyDigest = async () => {
  try {
    const EmailPreference = require('../models/EmailPreference');
    
    // Get users with daily digest enabled
    const users = await EmailPreference.find({
      'digestPreferences.enabled': true,
      'digestPreferences.frequency': 'daily',
    }).select('user');

    for (const pref of users) {
      // Get user's reminders from last 24 hours
      const reminders = await Reminder.find({
        user: pref.user,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        status: 'pending',
      }).limit(10);

      if (reminders.length > 0) {
        await createDigest(pref.user, reminders, 'daily');
      }
    }

    console.log('✉️ Daily digests queued');
  } catch (error) {
    console.error('Error sending daily digests:', error);
  }
};

// Send weekly digest emails
const sendWeeklyDigest = async () => {
  try {
    const EmailPreference = require('../models/EmailPreference');
    
    const users = await EmailPreference.find({
      'digestPreferences.enabled': true,
      'digestPreferences.frequency': 'weekly',
    }).select('user');

    for (const pref of users) {
      const reminders = await Reminder.find({
        user: pref.user,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        status: 'pending',
      }).limit(20);

      if (reminders.length > 0) {
        await createDigest(pref.user, reminders, 'weekly');
      }
    }

    console.log('✉️ Weekly digests queued');
  } catch (error) {
    console.error('Error sending weekly digests:', error);
  }
};

/**
 * Initialize scheduled reminder tasks (Cron jobs)
 * Call this in your main app.js or index.js
 */
const initializeReminderSchedules = () => {
  console.log('⏰ Initializing reminder schedules...');

  // Send pending reminders every hour
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ [Cron Job] Running: Send pending reminders (hourly)');
    await sendPendingReminders();
  });

  // Process snoozed reminders every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ [Cron Job] Running: Process snoozed reminders (every 5 min)');
    await processSnoozedReminders();
  });

  // Clean up old reminders daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ [Cron Job] Running: Clean up old reminders (daily 2 AM)');
    await cleanupOldReminders();
  });

  // Daily digest at 9 AM
  cron.schedule('0 9 * * *', () => {
    console.log('⏰ [Cron Job] Running: Daily digest job...');
    sendDailyDigest();
  });

  // Weekly digest on Monday at 9 AM
  cron.schedule('0 9 * * 1', () => {
    console.log('⏰ [Cron Job] Running: Weekly digest job...');
    sendWeeklyDigest();
  });

  console.log('✅ Reminder schedules initialized');
};

/**
 * Bulk mark reminders as viewed
 * @param {string} userId - User ID
 * @param {array} reminderIds - Array of reminder IDs (optional)
 * @returns {object} Update result
 */
const markAllAsViewed = async (userId, reminderIds = null) => {
  try {
    const query = {
      user: userId,
      status: { $in: ['pending', 'sent'] },
      isActive: true,
    };

    if (reminderIds && reminderIds.length > 0) {
      query._id = { $in: reminderIds };
    }

    const result = await Reminder.updateMany(query, {
      status: 'viewed',
      viewedAt: new Date(),
    });

    console.log(`✅ Marked ${result.modifiedCount} reminders as viewed`);
    return result;
  } catch (error) {
    console.error('❌ Error marking reminders as viewed:', error.message);
    throw error;
  }
};

// ============================================
// HELPER FUNCTIONS FOR COMMON REMINDER PATTERNS
// These are convenience functions controllers can use
// ============================================

/**
 * Create reminder for new job application
 * Notifies employer that someone applied
 */
const createNewApplicationReminder = async (employerId, applicationData) => {
  try {
    const dueDate = new Date();
    dueDate.setMinutes(dueDate.getMinutes() + 5); // Send in 5 minutes

    const reminder = await createReminder({
      user: employerId,
      type: 'new_application',
      title: '📧 New Application Received',
      description: `${applicationData.applicantName} applied for ${applicationData.jobTitle}`,
      dueDate,
      priority: 'high',
      relatedEntity: {
        application: applicationData.applicationId,
        job: applicationData.jobId,
      },
      templateData: {
        employerName: applicationData.employerName,
        jobTitle: applicationData.jobTitle,
        applicantName: applicationData.applicantName,
        applicantEmail: applicationData.applicantEmail,
        applicationLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/employer/applications/${applicationData.applicationId}`,
        tags: ['action-required'],
        urgencyLevel: 'high',
      },
    });

    console.log(`✅ New application reminder created for employer ${employerId}`);
    return reminder;
  } catch (error) {
    console.error('❌ Error creating new application reminder:', error.message);
  }
};

/**
 * Create reminder for interview scheduled
 * Notifies seeker about upcoming interview
 */
const createInterviewReminderForSeeker = async (seekerId, interviewData) => {
  try {
    const interviewDate = new Date(interviewData.interviewDate);
    const reminderDate = new Date(interviewDate);
    reminderDate.setDate(reminderDate.getDate() - 1); // 1 day before

    const daysUntil = Math.ceil(
      (interviewDate - new Date()) / (1000 * 60 * 60 * 24)
    );

    const reminder = await createReminder({
      user: seekerId,
      type: 'interview_scheduled',
      title: '🎉 Interview Scheduled!',
      description: `Interview at ${interviewData.companyName} for ${interviewData.jobTitle}`,
      dueDate: reminderDate,
      priority: 'high',
      relatedEntity: {
        application: interviewData.applicationId,
        job: interviewData.jobId,
      },
      templateData: {
        seekerName: interviewData.seekerName,
        jobTitle: interviewData.jobTitle,
        companyName: interviewData.companyName,
        interviewDate: interviewDate.toLocaleDateString(),
        interviewTime: interviewData.interviewTime,
        interviewMode: interviewData.interviewMode,
        daysUntil,
        applicationLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/applications/${interviewData.applicationId}`,
      },
    });

    console.log(`✅ Interview reminder created for seeker ${seekerId}`);
    return reminder;
  } catch (error) {
    console.error('❌ Error creating interview reminder:', error.message);
  }
};

/**
 * Create reminder for application status update
 * Notifies seeker when application status changes
 */
const createApplicationStatusReminder = async (seekerId, statusData) => {
  try {
    const dueDate = new Date();
    dueDate.setMinutes(dueDate.getMinutes() + 2); // Send immediately

    const statusClass =
      statusData.status.toLowerCase() === 'approved'
        ? 'approved'
        : statusData.status.toLowerCase() === 'rejected'
        ? 'rejected'
        : 'pending';

    const reminder = await createReminder({
      user: seekerId,
      type: 'application_status_update',
      title: `📬 Application Status: ${statusData.status.toUpperCase()}`,
      description: `Your application for ${statusData.jobTitle} has been updated`,
      dueDate,
      priority: statusData.status === 'approved' ? 'high' : 'medium',
      relatedEntity: {
        application: statusData.applicationId,
        job: statusData.jobId,
      },
      templateData: {
        seekerName: statusData.seekerName,
        jobTitle: statusData.jobTitle,
        companyName: statusData.companyName,
        status: statusData.status,
        statusClass,
        message: statusData.message || '',
      },
    });

    console.log(`✅ Application status reminder created for seeker ${seekerId}`);
    return reminder;
  } catch (error) {
    console.error('❌ Error creating application status reminder:', error.message);
  }
};

/**
 * Create reminder for employer verification pending
 * Notifies admin about new employer registration
 */
const createEmployerVerificationReminder = async (adminId, employerData) => {
  try {
    const dueDate = new Date();
    dueDate.setMinutes(dueDate.getMinutes() + 5); // Send in 5 minutes

    const reminder = await createReminder({
      user: adminId,
      type: 'verification_pending',
      title: '👤 New Employer Registration Pending',
      description: `${employerData.companyName} awaiting verification`,
      dueDate,
      priority: 'high',
      relatedEntity: {
        employer: employerData.employerId,
      },
      templateData: {
        companyName: employerData.companyName,
        contactName: employerData.contactName,
        email: employerData.email,
        registrationDate: new Date().toLocaleDateString(),
        verificationLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/employers/${employerData.employerId}`,
      },
    });

    console.log(`✅ Employer verification reminder created for admin`);
    return reminder;
  } catch (error) {
    console.error('❌ Error creating employer verification reminder:', error.message);
  }
};

/**
 * Create job deadline approaching reminder
 * Notifies seeker 3 days before job deadline
 */
const createJobDeadlineReminder = async (seekerId, jobData) => {
  try {
    const deadline = new Date(jobData.deadline);
    const reminderDate = new Date(deadline);
    reminderDate.setDate(reminderDate.getDate() - 3); // 3 days before

    const daysRemaining = Math.ceil(
      (deadline - new Date()) / (1000 * 60 * 60 * 24)
    );

    const reminder = await createReminder({
      user: seekerId,
      type: 'job_deadline',
      title: '⏰ Application Deadline Approaching',
      description: `Only ${daysRemaining} day(s) left to apply`,
      dueDate: reminderDate,
      priority: 'high',
      relatedEntity: {
        job: jobData.jobId,
      },
      templateData: {
        seekerName: jobData.seekerName,
        jobTitle: jobData.jobTitle,
        companyName: jobData.companyName,
        deadline: deadline.toLocaleDateString(),
        daysRemaining,
        jobLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobs/${jobData.jobId}`,
      },
    });

    console.log(`✅ Job deadline reminder created for seeker ${seekerId}`);
    return reminder;
  } catch (error) {
    console.error('❌ Error creating job deadline reminder:', error.message);
  }
};

/**
 * Create job expiring reminder for employer
 * Notifies employer 5 days before job posting expires
 */
const createJobExpiringReminder = async (employerId, jobData) => {
  try {
    const expiryDate = new Date(jobData.expiryDate);
    const reminderDate = new Date(expiryDate);
    reminderDate.setDate(reminderDate.getDate() - 5); // 5 days before

    const daysRemaining = Math.ceil(
      (expiryDate - new Date()) / (1000 * 60 * 60 * 24)
    );

    const reminder = await createReminder({
      user: employerId,
      type: 'job_expiring',
      title: '📢 Job Posting Expiring Soon',
      description: `Your job "${jobData.jobTitle}" expires in ${daysRemaining} day(s)`,
      dueDate: reminderDate,
      priority: 'medium',
      relatedEntity: {
        job: jobData.jobId,
      },
      templateData: {
        employerName: jobData.employerName,
        jobTitle: jobData.jobTitle,
        expiryDate: expiryDate.toLocaleDateString(),
        daysRemaining,
        totalApplications: jobData.totalApplications || 0,
        pendingApplications: jobData.pendingApplications || 0,
        renewLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/employer/jobs/${jobData.jobId}`,
      },
    });

    console.log(`✅ Job expiring reminder created for employer ${employerId}`);
    return reminder;
  } catch (error) {
    console.error('❌ Error creating job expiring reminder:', error.message);
  }
};

module.exports = {
  createReminder,
  getRemindersForUser,
  markAsViewed,
  snoozeReminder,
  dismissReminder,
  getReminderStats,
  sendPendingReminders,
  processSnoozedReminders,
  cleanupOldReminders,
  initializeReminderSchedules,
  markAllAsViewed,
  // Helper functions
  createNewApplicationReminder,
  createInterviewReminderForSeeker,
  createApplicationStatusReminder,
  createEmployerVerificationReminder,
  createJobDeadlineReminder,
  createJobExpiringReminder,
};
