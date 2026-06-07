const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const JobApplication = require('../models/JobApplication');
const ApplicationStage = require('../models/ApplicationStage');
const User = require('../models/User');

// ─── Create Offer ─────────────────────────────────────────────────
const createOffer = async (req, res) => {
  try {
    const {
      applicationId,
      position,
      department,
      salary,
      currency,
      frequency,
      benefits,
      joiningDate,
      employmentType,
      reportingTo,
      terms,
      expiryDays,
      notes,
    } = req.body;

    // Validate required fields
    if (!applicationId || !position || !salary || !joiningDate) {
      return res.status(400).json({
        success: false,
        message: 'Application ID, position, salary, and joining date are required',
      });
    }

    // Get application
    const jobApp = await JobApplication.findById(applicationId);
    if (!jobApp) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Get application stage to verify employer
    const currentStage = await ApplicationStage.findOne({
      application: applicationId,
      isActive: true,
    });

    // Verify permission
    if (
      req.user.role !== 'admin' &&
      (req.user.role !== 'employer' || currentStage?.employer?.toString() !== req.user.id)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if offer already exists
    const existingOffer = await Offer.findOne({
      application: applicationId,
      status: { $in: ['draft', 'sent', 'viewed', 'accepted'] },
    });

    if (existingOffer) {
      return res.status(400).json({
        success: false,
        message: 'Active offer already exists for this application',
      });
    }

    // Create offer
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (expiryDays || 7));

    const offer = await Offer.create({
      application: applicationId,
      job: jobApp.job,
      seeker: jobApp.seeker,
      employer: currentStage?.employer || req.user.id,
      position,
      department: department || '',
      salary: parseFloat(salary),
      currency: currency || 'USD',
      frequency: frequency || 'annual',
      benefits: benefits || '',
      joiningDate: new Date(joiningDate),
      employmentType: employmentType || 'Full-Time',
      reportingTo: reportingTo || '',
      terms: terms || '',
      expiryDate,
      notes: notes || '',
      createdBy: req.user.id,
    });

    await offer.populate([
      { path: 'seeker', select: 'name email' },
      { path: 'job', select: 'title companyName' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Create Offer Error:', error);
    res.status(500).json({ success: false, message: 'Failed to create offer' });
  }
};

// ─── Get Offer Details ────────────────────────────────────────────
const getOfferDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const offer = await Offer.findOne({
      application: applicationId,
    }).populate([
      { path: 'seeker', select: 'name email' },
      { path: 'job', select: 'title companyName' },
      { path: 'employer', select: 'name email' },
    ]);

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    // Verify access
    if (
      req.user.role !== 'admin' &&
      offer.seeker._id.toString() !== req.user.id &&
      offer.employer._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: offer });
  } catch (error) {
    console.error('Get Offer Details Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch offer' });
  }
};

// ─── Update Offer ────────────────────────────────────────────────
const updateOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const {
      position,
      department,
      salary,
      currency,
      frequency,
      benefits,
      joiningDate,
      employmentType,
      reportingTo,
      terms,
      expiryDays,
      notes,
    } = req.body;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    // Verify access (only employer who created offer or admin)
    if (
      req.user.role !== 'admin' &&
      (req.user.role !== 'employer' || offer.employer.toString() !== req.user.id)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Cannot update if already sent or accepted
    if (offer.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only update draft offers',
      });
    }

    // Update fields
    if (position) offer.position = position;
    if (department !== undefined) offer.department = department;
    if (salary) offer.salary = parseFloat(salary);
    if (currency) offer.currency = currency;
    if (frequency) offer.frequency = frequency;
    if (benefits !== undefined) offer.benefits = benefits;
    if (joiningDate) offer.joiningDate = new Date(joiningDate);
    if (employmentType) offer.employmentType = employmentType;
    if (reportingTo !== undefined) offer.reportingTo = reportingTo;
    if (terms !== undefined) offer.terms = terms;
    if (expiryDays) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      offer.expiryDate = expiryDate;
    }
    if (notes !== undefined) offer.notes = notes;

    await offer.save();
    await offer.populate([
      { path: 'seeker', select: 'name email' },
      { path: 'job', select: 'title companyName' },
    ]);

    res.json({
      success: true,
      message: 'Offer updated successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Update Offer Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update offer' });
  }
};

// ─── Send Offer ───────────────────────────────────────────────────
const sendOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    // Verify access
    if (
      req.user.role !== 'admin' &&
      (req.user.role !== 'employer' || offer.employer.toString() !== req.user.id)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (offer.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft offers can be sent',
      });
    }

    // Update offer status
    offer.status = 'sent';
    offer.sentAt = new Date();
    offer.sentBy = req.user.id;
    await offer.save();

    // TODO: Send email to candidate with offer details

    res.json({
      success: true,
      message: 'Offer sent successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Send Offer Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send offer' });
  }
};

// ─── Update Offer Status ───────────────────────────────────────────
const updateOfferStatus = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { status, candidateNotes } = req.body;

    // Validate status
    const validStatuses = ['accepted', 'rejected', 'viewed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be accepted, rejected, or viewed',
      });
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    // Check if offer is not already expired or withdrawn
    if (offer.status === 'expired' || offer.status === 'withdrawn') {
      return res.status(400).json({
        success: false,
        message: `Cannot respond to ${offer.status} offer`,
      });
    }

    // Check if offer has expired
    if (offer.expiryDate && new Date() > offer.expiryDate) {
      offer.status = 'expired';
      await offer.save();
      return res.status(400).json({
        success: false,
        message: 'Offer has expired',
      });
    }

    // Determine who can update based on action
    if (status === 'accepted' || status === 'rejected') {
      // Only candidate can accept/reject
      if (offer.seeker.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Only the candidate can respond to the offer',
        });
      }
      offer.respondedAt = new Date();
      offer.candidateNotes = candidateNotes || '';
    } else if (status === 'viewed') {
      // Candidate viewing the offer
      if (offer.seeker.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }
      offer.viewedAt = new Date();
    }

    offer.status = status;
    
    if (status === 'rejected') {
      offer.rejectionReason = candidateNotes || 'No reason provided';
    }

    await offer.save();
    await offer.populate([
      { path: 'seeker', select: 'name email' },
      { path: 'job', select: 'title' },
    ]);

    // If accepted, update application status to Accepted
    if (status === 'accepted') {
      await ApplicationStage.updateMany(
        { application: offer.application },
        { isActive: false }
      );

      await ApplicationStage.create({
        application: offer.application,
        job: offer.job,
        seeker: offer.seeker,
        employer: offer.employer,
        stage: 'Accepted',
        previousStage: 'Offer Extended',
        movedBy: req.user.id,
        movedByRole: 'system',
        notes: 'Offer accepted by candidate',
      });

      await JobApplication.findByIdAndUpdate(offer.application, {
        status: 'Accepted',
      });
    }

    res.json({
      success: true,
      message: `Offer ${status} successfully`,
      data: offer,
    });
  } catch (error) {
    console.error('Update Offer Status Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update offer status' });
  }
};

// ─── Withdraw Offer ───────────────────────────────────────────────
const withdrawOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { withdrawReason } = req.body;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    // Verify access (only employer or admin can withdraw)
    if (
      req.user.role !== 'admin' &&
      (req.user.role !== 'employer' || offer.employer.toString() !== req.user.id)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (offer.status === 'accepted' || offer.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: `Cannot withdraw ${offer.status} offer`,
      });
    }

    offer.status = 'withdrawn';
    offer.withdrawnBy = req.user.id;
    offer.withdrawReason = withdrawReason || '';
    await offer.save();

    // TODO: Send withdrawal notification email to candidate

    res.json({
      success: true,
      message: 'Offer withdrawn successfully',
      data: offer,
    });
  } catch (error) {
    console.error('Withdraw Offer Error:', error);
    res.status(500).json({ success: false, message: 'Failed to withdraw offer' });
  }
};

// ─── Get Offers for Employer ───────────────────────────────────────
const getEmployerOffers = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { employer: req.user.id };
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const offers = await Offer.find(filter)
      .populate([
        { path: 'seeker', select: 'name email' },
        { path: 'job', select: 'title' },
      ])
      .sort({ sentAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Offer.countDocuments(filter);

    res.json({
      success: true,
      data: {
        offers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get Employer Offers Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch offers' });
  }
};

// ─── Get Offers for Candidate ──────────────────────────────────────
const getCandidateOffers = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { seeker: req.user.id };
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const offers = await Offer.find(filter)
      .populate([
        { path: 'job', select: 'title companyName' },
        { path: 'employer', select: 'name' },
      ])
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Offer.countDocuments(filter);

    res.json({
      success: true,
      data: {
        offers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get Candidate Offers Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch offers' });
  }
};

module.exports = {
  createOffer,
  getOfferDetails,
  updateOffer,
  sendOffer,
  updateOfferStatus,
  withdrawOffer,
  getEmployerOffers,
  getCandidateOffers,
};
