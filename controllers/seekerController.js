const User = require("../models/User");
const Job = require("../models/Job");
const JobApplication = require("../models/jobapplication");


// ============================
// GET MY PROFILE
// ============================
const fs = require('fs');
const User = require('../models/User');
const SeekerProfile = require('../models/SeekerProfile');
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const EmployerProfile = require('../models/EmployerProfile');
const configureCloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');
const { createNewApplicationReminder } = require('../utils/reminderService');
const { initializeApplicationStage } = require('./atsController');

let cloudinaryClient;

const getCloudinaryClient = () => {
  if (!cloudinaryClient) {
    cloudinaryClient = configureCloudinary();
  }

  return cloudinaryClient;
};

const removeLocalFile = (filePath) => {
  if (!filePath) return;

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    console.log('Failed to remove temporary file:', error.message);
  }
};

const uploadToCloudinary = async (file, options = {}) => {
  if (!file) return null;

  const hasCloudinaryConfig =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  // Development fallback: save file locally if Cloudinary is not configured
  if (!hasCloudinaryConfig) {
    return {
      url: `/uploads/${file.filename}`,
      publicId: '',
      resourceType: options.resourceType || 'raw',
      format: file.mimetype || '',
      bytes: file.size || 0,
      uploadedAt: new Date(),
    };
  }

  const cloudinary = getCloudinaryClient();
  const uploadOptions = {
    folder: options.folder,
    resource_type: options.resourceType || 'image',
  };

  try {
    const result = await cloudinary.uploader.upload(file.path, uploadOptions);
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
  if (!files || !files[fieldName] || !files[fieldName].length) {
    return null;
  }

  return files[fieldName][0];
};

const syncEmployerJobStats = async (employerId) => {
  if (!employerId) return;

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

const getPublicJobVisibilityFilter = (jobId) => ({
  _id: jobId,
  status: 'active',
  // Keep the seeker flow aligned with the public board:
  // active jobs stay visible unless they were explicitly marked unapproved.
  isApproved: { $ne: false },
});

const getMyProfile = async (req, res) => {

  try {

    const user = await User.findById(
      req.userId
    ).select("-password");

    res.json(user);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });

  }

};


// ============================
// UPDATE PROFILE
// ============================

const updateMyProfile = async (req, res) => {

  try {

    const updatedData = {

      name: req.body.fullName || "",

      phone: req.body.phone || "",

      location: req.body.location || "",

      skills: req.body.skills || "",

      education: req.body.education || "",

      experience: req.body.experience || "",

      linkedin: req.body.linkedin || "",

      github: req.body.github || "",

      bio: req.body.bio || "",

    };

    // PROFILE IMAGE
    if (req.file) {

      updatedData.profileImage =
        `http://localhost:5000/uploads/${req.file.filename}`;

    }

    const updatedUser =
      await User.findByIdAndUpdate(
        req.userId,
        updatedData,
        { new: true }
      ).select("-password");

    res.json(updatedUser);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: error.message || "Server Error",
    });

  }

};


// ============================
// APPLY JOB
// ============================

const applyJob = async (req, res) => {

  try {

    const { coverLetter } = req.body;

const jobId = req.params.jobId;

    // CHECK JOB
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    // CHECK ALREADY APPLIED
    const alreadyApplied =
      await JobApplication.findOne({
        seeker: req.userId,
        job: jobId,
      });

    if (alreadyApplied) {
      return res.status(400).json({
        message: "You already applied for this job",
      });
    }

    // CREATE APPLICATION
    const application =
      new JobApplication({

        seeker: req.userId,

        job: jobId,

        coverLetter,

        resume: req.file
        ? `uploads/${req.file.filename}`
        : "",

      });

    await application.save();

    res.status(201).json({
      message:
        "Application submitted successfully",
      application,
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });

  }

};


// ============================
// MY APPLICATIONS
// ============================

const getMyApplications = async (req, res) => {

  try {

    const applications =
      await JobApplication.find({
        seeker: req.userId,
      })
      .populate("job")
      .sort({ createdAt: -1 });

    res.json(applications);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });

  }

};


module.exports = {

  getMyProfile,

  updateMyProfile,

  applyJob,

  getMyApplications,

};