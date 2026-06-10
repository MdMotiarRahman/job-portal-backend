const mongoose = require('mongoose');
const fs = require('fs');
const EmployerProfile = require('../models/EmployerProfile');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const ApplicationStage = require('../models/ApplicationStage');
const User = require('../models/User');
const { createJobExpiringReminder } = require('../utils/reminderService');

let cloudinaryClient = null;

const configureCloudinary = () => {
  try {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return cloudinary;
  } catch (error) {
    return null;
  }
};

const getCloudinaryClient = () => {
  if (!cloudinaryClient) {
    cloudinaryClient = configureCloudinary();
  }
  return cloudinaryClient;
};

const removeLocalFile = (filePath) => {
  if (!filePath) return;
  try { fs.unlinkSync(filePath); } catch (error) { /* ignore */ }
};

const uploadToCloudinary = async (file, options = {}) => {
  if (!file) return null;

  const hasCloudinaryConfig =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (!hasCloudinaryConfig) {
    return {
      url: `/uploads/${file.filename}`,
      publicId: '',
      resourceType: options.resourceType || 'image',
      format: file.mimetype || '',
      bytes: file.size || 0,
      uploadedAt: new Date(),
    };
  }

  const cloudinary = getCloudinaryClient();
  if (!cloudinary) {
    return {
      url: `/uploads/${file.filename}`,
      publicId: '',
      resourceType: options.resourceType || 'image',
      format: file.mimetype || '',
      bytes: file.size || 0,
      uploadedAt: new Date(),
    };
  }

  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: options.folder || 'job-portal/logos',
      resource_type: options.resourceType || 'image',
    });
    return {
      url: result.secure_url || '',
      publicId: result.public_id || '',
      resourceType: result.resource_type || '',
      format: result.format || '',
      bytes: result.bytes || 0,
      uploadedAt: new Date(),
    };
  } finally {
    removeLocalFile(file.path);
  }
};

const getFirstFile = (files, fieldName) => {
  if (!files || !files[fieldName] || !files[fieldName].length) return null;
  return files[fieldName][0];
};

const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const experienceLevels = ['Entry', 'Mid', 'Senior'];
const jobStatuses = ['active', 'inactive', 'closed'];
const applicationStatuses = [
  'Pending',
  'Reviewing',
  'Shortlisted',
  'Interview Scheduled',
  'Accepted',
  'Rejected',
];

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const ensureEmployerProfile = async (user) => {
  return EmployerProfile.findOneAndUpdate(
    { user: user._id },
    {
      $setOnInsert: {
        user: user._id,
        companyName: user.name || user.email || 'Employer',
        verificationStatus: 'pending',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const syncEmployerStats = async (employerId) => {
  const jobs = await Job.find({ company: employerId }).select('applications');
  const totalApplications = jobs.reduce(
    (sum, job) => sum + (Array.isArray(job.applications) ? job.applications.length : 0),
    0
  );

  await EmployerProfile.findOneAndUpdate(
    { user: employerId },
    {
      totalJobs: jobs.length,
      totalApplications,
    },
    { upsert: false }
  );
};

const buildJobPayload = (body) => {
  const payload = {};

  if (body.title !== undefined) payload.title = String(body.title).trim();
  if (body.description !== undefined) payload.description = String(body.description).trim();
  if (body.location !== undefined) payload.location = String(body.location).trim();
  if (body.jobType !== undefined) payload.jobType = body.jobType;
  if (body.experienceLevel !== undefined) payload.experienceLevel = body.experienceLevel;
  if (body.status !== undefined) payload.status = body.status;
  if (body.requirements !== undefined) payload.requirements = toArray(body.requirements);
  if (body.skills !== undefined) payload.skills = toArray(body.skills);

  if (
    body.salaryMin !== undefined ||
    body.salaryMax !== undefined ||
    body.salaryCurrency !== undefined ||
    body.salary !== undefined
  ) {
    const salary = body.salary || {};
    payload.salary = {
      min: toNumberOrNull(body.salaryMin ?? salary.min),
      max: toNumberOrNull(body.salaryMax ?? salary.max),
      currency: String(body.salaryCurrency ?? salary.currency ?? 'USD').trim() || 'USD',
    };
  }

  return payload;
};

const validateJobPayload = (payload, { partial = false } = {}) => {
  const requiredFields = ['title', 'description', 'location', 'jobType', 'experienceLevel', 'skills'];

  if (!partial) {
    const missingField = requiredFields.find((field) => {
      if (field === 'skills') return !payload.skills || payload.skills.length === 0;
      return !payload[field];
    });

    if (missingField) return `${missingField} is required`;
  }

  if (payload.jobType !== undefined && !jobTypes.includes(payload.jobType)) {
    return 'Invalid job type';
  }

  if (payload.experienceLevel !== undefined && !experienceLevels.includes(payload.experienceLevel)) {
    return 'Invalid experience level';
  }

  if (payload.status !== undefined && !jobStatuses.includes(payload.status)) {
    return 'Invalid job status';
  }

  if (payload.skills !== undefined && payload.skills.length === 0) {
    return 'At least one skill is required';
  }

  if (payload.salary) {
    const { min, max } = payload.salary;
    if (min !== null && min < 0) return 'Minimum salary cannot be negative';
    if (max !== null && max < 0) return 'Maximum salary cannot be negative';
    if (min !== null && max !== null && min > max) {
      return 'Minimum salary cannot be greater than maximum salary';
    }
  }

  return null;
};

const findEmployerJob = async (employerId, jobId) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) return null;

  return Job.findOne({
    _id: jobId,
    company: employerId,
  });
};

exports.getEmployerSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user || user.role !== 'employer') {
      return res.status(404).json({ message: 'Employer not found' });
    }

    const profile = await ensureEmployerProfile(user);
    const jobs = await Job.find({ company: req.user.id }).select('status isApproved applications');

    const stats = jobs.reduce(
      (summary, job) => {
        summary.totalJobs += 1;
        summary.totalApplications += Array.isArray(job.applications) ? job.applications.length : 0;
        if (job.isApproved) summary.approvedJobs += 1;
        if (!job.isApproved) summary.pendingJobs += 1;
        if (job.status === 'closed') summary.closedJobs += 1;
        return summary;
      },
      {
        totalJobs: 0,
        pendingJobs: 0,
        approvedJobs: 0,
        closedJobs: 0,
        totalApplications: 0,
      }
    );

    res.json({ user, profile, stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ company: req.user.id })
      .populate('company', 'name email')
      .populate({
        path: 'applications',
        select: 'status createdAt',
      })
      .sort({ createdAt: -1 });

    res.json({ jobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createJob = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'employer') {
      return res.status(404).json({ message: 'Employer not found' });
    }

    await ensureEmployerProfile(user);

    const payload = {
      ...buildJobPayload(req.body),
      company: req.user.id,
      isApproved: false,
      approvedBy: null,
      approvalNotes: '',
    };
    const validationError = validateJobPayload(payload);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const job = await Job.create(payload);
    await syncEmployerStats(req.user.id);

    const populatedJob = await Job.findById(job._id).populate('company', 'name email');

    // ========== 🎯 REMINDER INTEGRATION ==========
    // Create reminder for employer - notify when job posting is expiring
    await createJobExpiringReminder(req.user.id, {
      jobId: job._id,
      employerName: user.name,
      jobTitle: job.title,
      expiryDate: job.expiryDate,
      totalApplications: 0,
      pendingApplications: 0,
    });

    console.log(`📧 Job expiry reminder queued for job: ${job.title}`);
    // ===============================================

    res.status(201).json({
      message: 'Job created successfully and submitted for admin approval.',
      job: populatedJob,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await findEmployerJob(req.user.id, req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const payload = buildJobPayload(req.body);
    const validationError = validateJobPayload(payload, { partial: true });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    Object.assign(job, payload);
    job.isApproved = false;
    job.approvedBy = null;
    job.approvalNotes = 'Edited by employer. Pending admin review.';

    await job.save();

    const populatedJob = await Job.findById(job._id).populate('company', 'name email');

    res.json({
      message: 'Job updated successfully and resubmitted for approval.',
      job: populatedJob,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await findEmployerJob(req.user.id, req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.applications?.length) {
      await JobApplication.deleteMany({ _id: { $in: job.applications } });
    }

    await Job.deleteOne({ _id: job._id });
    await syncEmployerStats(req.user.id);

    res.json({ message: 'Job deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.closeJob = async (req, res) => {
  try {
    const job = await findEmployerJob(req.user.id, req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    job.status = 'closed';
    await job.save();

    res.json({ message: 'Job closed successfully.', job });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.reopenJob = async (req, res) => {
  try {
    const job = await findEmployerJob(req.user.id, req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    job.status = 'active';
    await job.save();

    res.json({ message: 'Job reopened successfully.', job });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getApplications = async (req, res) => {
  try {
    const filter = {};
    const jobId = req.query.jobId || req.params.jobId;

    if (jobId) {
      const job = await findEmployerJob(req.user.id, jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      filter.job = job._id;
    } else {
      const jobs = await Job.find({ company: req.user.id }).select('_id');
      filter.job = { $in: jobs.map((job) => job._id) };
    }

    const applications = await JobApplication.find(filter)
      .populate('seeker', 'name email phone location')
      .populate('job', 'title location company')
      .sort({ createdAt: -1 });

    res.json({ applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateApplication = async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id).populate('job');
    if (!application || !application.job) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.job.company.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own job applications' });
    }

    const payload = {};

    if (req.body.status !== undefined) {
      if (!applicationStatuses.includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid application status' });
      }

      payload.status = req.body.status;

      if (req.body.status === 'Rejected') {
        payload.interviewDate = '';
        payload.interviewTime = '';
        payload.interviewMode = '';
        payload.employerMessage =
          req.body.employerMessage || 'Sorry, you were not selected for this job.';
      }
    }

    ['interviewDate', 'interviewTime', 'interviewMode', 'employerMessage'].forEach((field) => {
      if (req.body[field] !== undefined && payload[field] === undefined) {
        payload[field] = String(req.body[field]).trim();
      }
    });

    const updatedApplication = await JobApplication.findByIdAndUpdate(
      application._id,
      payload,
      { new: true }
    )
      .populate('seeker', 'name email phone location')
      .populate('job', 'title location company');

    if (req.body.status !== undefined) {
      const statusToStage = {
        Pending: 'Applied',
        Reviewing: 'Reviewing',
        Shortlisted: 'Shortlisted',
        'Interview Scheduled': 'Interview Scheduled',
        Accepted: 'Accepted',
        Rejected: 'Rejected',
      };

      const targetStage = statusToStage[req.body.status];
      if (targetStage) {
        const currentActive = await ApplicationStage.findOne({
          application: application._id,
          isActive: true,
        }).sort({ createdAt: -1 });

        if (currentActive && currentActive.stage !== targetStage) {
          currentActive.isActive = false;
          await currentActive.save();

          await ApplicationStage.create({
            application: application._id,
            job: application.job._id,
            seeker: application.seeker,
            employer: req.user.id,
            stage: targetStage,
            previousStage: currentActive.stage,
            movedBy: req.user.id,
            movedByRole: 'employer',
            notes: req.body.employerMessage || '',
          });
        } else if (!currentActive) {
          await ApplicationStage.create({
            application: application._id,
            job: application.job._id,
            seeker: application.seeker,
            employer: req.user.id,
            stage: targetStage,
            previousStage: null,
            movedBy: req.user.id,
            movedByRole: 'employer',
            notes: req.body.employerMessage || '',
          });
        }
      }
    }

    res.json({
      message: 'Application updated successfully.',
      application: updatedApplication,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ============================================
   EMPLOYER PROFILE
   ============================================ */

exports.getEmployerProfile = async (req, res) => {
  try {
    const profile = await ensureEmployerProfile(
      await User.findById(req.user.id)
    );

    const user = await User.findById(req.user.id).select('name email');

    res.json({
      profile: {
        ...profile.toObject(),
        userName: user?.name || '',
        userEmail: user?.email || '',
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateEmployerProfile = async (req, res) => {
  try {
    const allowedFields = [
      'companyName',
      'companyWebsite',
      'companyDescription',
      'companySize',
      'industry',
      'location',
      'phone',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const logoFile = getFirstFile(req.files, 'companyLogo');
    if (logoFile) {
      const logoMeta = await uploadToCloudinary(logoFile, {
        folder: 'job-portal/logos',
        resourceType: 'image',
      });
      if (logoMeta) {
        updates.logo = logoMeta;
      }
    }

    const profile = await EmployerProfile.findOneAndUpdate(
      { user: req.user.id },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (req.body.companyName) {
      await User.findByIdAndUpdate(req.user.id, { name: req.body.companyName });
    }

    res.json({
      message: 'Profile updated successfully.',
      profile,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
