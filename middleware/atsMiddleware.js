const mongoose = require('mongoose');
const ApplicationStage = require('../models/ApplicationStage');
const Interview = require('../models/Interview');
const Offer = require('../models/Offer');

/**
 * Middleware to check if user has permission to access an ATS application
 */
const checkApplicationAccess = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      return res.status(400).json({ success: false, message: 'Application ID is required' });
    }

    const applicationStage = await ApplicationStage.findOne({
      application: new mongoose.Types.ObjectId(applicationId),
      isActive: true,
    });

    if (!applicationStage) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Admin has access to all
    if (req.user.role === 'admin') {
      req.applicationStage = applicationStage;
      return next();
    }

    // Employer can only access their own applications
    if (req.user.role === 'employer') {
      if (applicationStage.employer?.toString() === req.user.id) {
        req.applicationStage = applicationStage;
        return next();
      }
    }

    // Seeker can view their own application
    if (req.user.role === 'seeker') {
      if (applicationStage.seeker?.toString() === req.user.id) {
        req.applicationStage = applicationStage;
        return next();
      }
    }

    return res.status(403).json({ success: false, message: 'Access denied' });
  } catch (error) {
    console.error('Check Application Access Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify access' });
  }
};

/**
 * Middleware to check if user has permission to manage interviews
 */
const checkInterviewAccess = async (req, res, next) => {
  try {
    const { interviewId } = req.params;

    if (!interviewId) {
      return res.status(400).json({ success: false, message: 'Interview ID is required' });
    }

    const interview = await Interview.findById(interviewId);

    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Admin has access
    if (req.user.role === 'admin') {
      req.interview = interview;
      return next();
    }

    // Employer can manage their own interviews
    if (req.user.role === 'employer') {
      if (interview.employer?.toString() === req.user.id) {
        req.interview = interview;
        return next();
      }
    }

    // Seeker can view their own interviews
    if (req.user.role === 'seeker') {
      if (interview.seeker?.toString() === req.user.id) {
        req.interview = interview;
        return next();
      }
    }

    return res.status(403).json({ success: false, message: 'Access denied' });
  } catch (error) {
    console.error('Check Interview Access Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify access' });
  }
};

/**
 * Middleware to check if user has permission to manage offers
 */
const checkOfferAccess = async (req, res, next) => {
  try {
    const { offerId } = req.params;

    if (!offerId) {
      return res.status(400).json({ success: false, message: 'Offer ID is required' });
    }

    const offer = await Offer.findById(offerId);

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    // Admin has access
    if (req.user.role === 'admin') {
      req.offer = offer;
      return next();
    }

    // Employer can manage their own offers
    if (req.user.role === 'employer') {
      if (offer.employer?.toString() === req.user.id) {
        req.offer = offer;
        return next();
      }
    }

    // Seeker can view their own offers
    if (req.user.role === 'seeker') {
      if (offer.seeker?.toString() === req.user.id) {
        req.offer = offer;
        return next();
      }
    }

    return res.status(403).json({ success: false, message: 'Access denied' });
  } catch (error) {
    console.error('Check Offer Access Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify access' });
  }
};

/**
 * Middleware to validate stage transitions
 */
const validateStageTransition = (req, res, next) => {
  const { stage } = req.body;

  const validStages = [
    'Applied',
    'Screening',
    'Reviewing',
    'Shortlisted',
    'Interview Scheduled',
    'Assessment',
    'Offer Extended',
    'Accepted',
    'Rejected',
    'Withdrawn',
  ];

  if (!validStages.includes(stage)) {
    return res.status(400).json({
      success: false,
      message: `Invalid stage. Valid stages are: ${validStages.join(', ')}`,
    });
  }

  next();
};

/**
 * Middleware to log ATS operations (audit trail)
 */
const logATSOperation = (action) => {
  return (req, res, next) => {
    // Store operation details in request for logging
    req.atsOperation = {
      action,
      user: req.user.id,
      role: req.user.role,
      timestamp: new Date(),
      ip: req.ip,
    };

    // TODO: Implement actual logging to database or log file
    console.log(`[ATS ${action}] User: ${req.user.id}, Role: ${req.user.role}`);

    next();
  };
};

module.exports = {
  checkApplicationAccess,
  checkInterviewAccess,
  checkOfferAccess,
  validateStageTransition,
  logATSOperation,
};
