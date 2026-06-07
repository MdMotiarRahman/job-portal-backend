const mongoose = require('mongoose');
const Interview = require('../models/Interview');
const ApplicationStage = require('../models/ApplicationStage');
const JobApplication = require('../models/JobApplication');
const User = require('../models/User');
const Job = require('../models/Job');
const { sendEmail } = require('../utils/emailService');

// ─── Helpers ──────────────────────────────────────────────────────
const validateInterviewData = (data) => {
  const errors = [];

  if (!data.date || !data.time) {
    errors.push('Interview date and time are required');
  }

  if (data.date) {
    const interviewDate = new Date(data.date);
    const now = new Date();
    if (interviewDate < now) {
      errors.push('Interview date cannot be in the past');
    }
  }

  if (!data.mode || !['Video', 'In-Person', 'Phone', 'Hybrid'].includes(data.mode)) {
    errors.push('Valid interview mode is required');
  }

  if ((data.mode === 'In-Person' || data.mode === 'Hybrid') && !data.location?.trim()) {
    errors.push('Location is required for in-person interviews');
  }

  return errors;
};

// ─── Schedule Interview ───────────────────────────────────────────
const scheduleInterview = async (req, res) => {
  try {
    const {
      applicationId,
      date,
      time,
      mode,
      location,
      duration,
      panelMembers,
      topics,
      preparationMaterials,
      meetingLink,
    } = req.body;

    // Validate input
    const errors = validateInterviewData({ date, time, mode, location });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; ') });
    }

    if (!applicationId) {
      return res.status(400).json({ success: false, message: 'Application ID is required' });
    }

    // Get application details
    const jobApp = await JobApplication.findById(applicationId);
    if (!jobApp) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Verify employer has permission (admin or application's employer)
    const currentAppStage = await ApplicationStage.findOne({
      application: applicationId,
      isActive: true,
    });

    if (
      req.user.role !== 'admin' &&
      (req.user.role !== 'employer' || currentAppStage?.employer?.toString() !== req.user.id)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if interview already exists
    const existingInterview = await Interview.findOne({
      application: applicationId,
      status: { $in: ['scheduled', 'in-progress'] },
    });

    if (existingInterview) {
      return res.status(400).json({
        success: false,
        message: 'Active interview already exists for this application',
      });
    }

    // Create interview
    const interview = await Interview.create({
      application: applicationId,
      job: jobApp.job,
      seeker: jobApp.seeker,
      employer: currentAppStage?.employer || req.user.id,
      date: new Date(date),
      time,
      mode,
      location: location || '',
      duration: duration || 60,
      panelMembers: panelMembers || [],
      topics: topics || '',
      preparationMaterials: preparationMaterials || '',
      meetingLink: meetingLink || '',
      createdBy: req.user.id,
    });

    // Populate references
    await interview.populate([
      { path: 'seeker', select: 'name email' },
      { path: 'job', select: 'title companyName' },
      { path: 'employer', select: 'name email' },
    ]);

    // Send notification email to candidate (can be enhanced with templates)
    // TODO: Implement email sending with proper templates

    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully',
      data: interview,
    });
  } catch (error) {
    console.error('Schedule Interview Error:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule interview' });
  }
};

// ─── Get Interview Details ────────────────────────────────────────
const getInterviewDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const interview = await Interview.findOne({
      application: applicationId,
    }).populate([
      { path: 'seeker', select: 'name email avatar' },
      { path: 'job', select: 'title companyName' },
      { path: 'employer', select: 'name email' },
      { path: 'createdBy', select: 'name email' },
    ]);

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Verify access
    if (
      req.user.role !== 'admin' &&
      interview.seeker._id.toString() !== req.user.id &&
      interview.employer._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: interview });
  } catch (error) {
    console.error('Get Interview Details Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch interview details' });
  }
};

// ─── Update Interview ────────────────────────────────────────────
const updateInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { date, time, mode, location, duration, topics, preparationMaterials, meetingLink, panelMembers } = req.body;

    // Find interview
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Verify access (only employer or admin can update)
    if (
      req.user.role !== 'admin' &&
      (req.user.role !== 'employer' || interview.employer.toString() !== req.user.id)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Cannot update if already completed
    if (interview.status === 'completed' || interview.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot update ${interview.status} interview`,
      });
    }

    // Validate new data if provided
    if (date || time || mode) {
      const errors = validateInterviewData({
        date: date || interview.date,
        time: time || interview.time,
        mode: mode || interview.mode,
        location: location || interview.location,
      });

      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: errors.join('; ') });
      }
    }

    // Update interview
    if (date) interview.date = new Date(date);
    if (time) interview.time = time;
    if (mode) interview.mode = mode;
    if (location !== undefined) interview.location = location;
    if (duration) interview.duration = duration;
    if (topics !== undefined) interview.topics = topics;
    if (preparationMaterials !== undefined) interview.preparationMaterials = preparationMaterials;
    if (meetingLink !== undefined) interview.meetingLink = meetingLink;
    if (panelMembers) interview.panelMembers = panelMembers;

    await interview.save();
    await interview.populate([
      { path: 'seeker', select: 'name email' },
      { path: 'job', select: 'title companyName' },
      { path: 'employer', select: 'name email' },
    ]);

    res.json({
      success: true,
      message: 'Interview updated successfully',
      data: interview,
    });
  } catch (error) {
    console.error('Update Interview Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update interview' });
  }
};

// ─── Cancel Interview ────────────────────────────────────────────
const cancelInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { cancelReason } = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Verify access
    if (
      req.user.role !== 'admin' &&
      interview.employer.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (interview.status === 'cancelled' || interview.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel ${interview.status} interview`,
      });
    }

    // Update interview
    interview.status = 'cancelled';
    interview.cancelledBy = req.user.id;
    interview.cancelReason = cancelReason || '';
    await interview.save();

    // TODO: Send cancellation notification email to candidate

    res.json({
      success: true,
      message: 'Interview cancelled successfully',
      data: interview,
    });
  } catch (error) {
    console.error('Cancel Interview Error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel interview' });
  }
};

// ─── Send Interview Notification ──────────────────────────────────
const sendInterviewNotification = async (req, res) => {
  try {
    const { interviewId } = req.params;

    const interview = await Interview.findById(interviewId).populate([
      { path: 'seeker', select: 'name email' },
      { path: 'job', select: 'title' },
      { path: 'employer', select: 'name' },
    ]);

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Verify access
    if (
      req.user.role !== 'admin' &&
      interview.employer._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (interview.notificationSentAt) {
      return res.status(400).json({
        success: false,
        message: 'Notification already sent for this interview',
      });
    }

    // Prepare email data
    const emailData = {
      to: interview.seeker.email,
      subject: `Interview Scheduled for ${interview.job.title}`,
      template: 'interview_scheduled',
      data: {
        candidateName: interview.seeker.name,
        position: interview.job.title,
        company: interview.employer.name,
        date: new Date(interview.date).toLocaleDateString(),
        time: interview.time,
        mode: interview.mode,
        location: interview.location,
        meetingLink: interview.meetingLink,
        topics: interview.topics,
        materials: interview.preparationMaterials,
      },
    };

    // TODO: Send email using sendEmail function
    // await sendEmail(emailData);

    // Mark notification as sent
    interview.notificationSentAt = new Date();
    await interview.save();

    res.json({
      success: true,
      message: 'Interview notification sent successfully',
      data: interview,
    });
  } catch (error) {
    console.error('Send Interview Notification Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
};

// ─── Get Interviews for Employer ──────────────────────────────────
const getEmployerInterviews = async (req, res) => {
  try {
    const { status, dateFrom, dateTo, page = 1, limit = 10 } = req.query;

    const filter = { employer: req.user.id };

    if (status) {
      filter.status = status;
    }

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const interviews = await Interview.find(filter)
      .populate([
        { path: 'seeker', select: 'name email avatar' },
        { path: 'job', select: 'title' },
      ])
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Interview.countDocuments(filter);

    res.json({
      success: true,
      data: {
        interviews,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get Employer Interviews Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch interviews' });
  }
};

// ─── Get Candidate Interviews ────────────────────────────────────
const getCandidateInterviews = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { seeker: req.user.id };

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const interviews = await Interview.find(filter)
      .populate([
        { path: 'job', select: 'title companyName' },
        { path: 'employer', select: 'name email' },
      ])
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Interview.countDocuments(filter);

    res.json({
      success: true,
      data: {
        interviews,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get Candidate Interviews Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch interviews' });
  }
};

module.exports = {
  scheduleInterview,
  getInterviewDetails,
  updateInterview,
  cancelInterview,
  sendInterviewNotification,
  getEmployerInterviews,
  getCandidateInterviews,
};
