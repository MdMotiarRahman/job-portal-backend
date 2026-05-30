const fs = require('fs');
const User = require('../models/User');
const SeekerProfile = require('../models/SeekerProfile');
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const EmployerProfile = require('../models/EmployerProfile');
const configureCloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');

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
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profile = await SeekerProfile.findOneAndUpdate(
      { user: req.user.id },
      {
        $setOnInsert: {
          user: req.user.id,
          fullName: user.name || '',
          phone: user.phone || '',
          location: user.location || '',
          skills: user.skills || '',
          education: user.education || '',
          experience: user.experience || '',
          linkedin: user.linkedin || '',
          github: user.github || '',
          bio: user.bio || '',
          profileImage: {
            url: user.profileImage || '',
          },
          resume: {
            url: user.resume || '',
          },
        },
      },
      {
        new: true,
        upsert: true,
      }
    );

    res.json({
      ...user.toObject(),
      name: profile.fullName || user.name || '',
      fullName: profile.fullName || user.name || '',
      phone: profile.phone || '',
      location: profile.location || '',
      skills: profile.skills || '',
      education: profile.education || '',
      experience: profile.experience || '',
      linkedin: profile.linkedin || '',
      github: profile.github || '',
      bio: profile.bio || '',
      profileImage: profile.profileImage?.url || '',
      profileImageMeta: profile.profileImage || null,
      resume: profile.resume?.url || '',
      resumeMeta: profile.resume || null,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: 'Server Error',
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const existingUser = await User.findById(req.user.id).select('-password');
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedData = {
      name: req.body.fullName || existingUser.name || '',
      phone: req.body.phone || '',
      location: req.body.location || '',
      skills: req.body.skills || '',
      education: req.body.education || '',
      experience: req.body.experience || '',
      linkedin: req.body.linkedin || '',
      github: req.body.github || '',
      bio: req.body.bio || '',
    };

    const profileImageFile = getFirstFile(req.files, 'profileImage');
    const resumeFile = getFirstFile(req.files, 'resume');
    let profileImageMeta = null;
    let resumeMeta = null;

    if (profileImageFile) {
      profileImageMeta = await uploadToCloudinary(profileImageFile, {
        folder: 'job-portal/profiles',
        resourceType: 'image',
      });
      updatedData.profileImage = profileImageMeta.url;
    }

    if (resumeFile) {
      resumeMeta = await uploadToCloudinary(resumeFile, {
        folder: 'job-portal/resumes',
        resourceType: 'raw',
      });
      updatedData.resume = resumeMeta.url;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updatedData,
      { new: true }
    ).select('-password');

    const profileUpdatePayload = {
      fullName: updatedData.name,
      phone: updatedData.phone,
      location: updatedData.location,
      skills: updatedData.skills,
      education: updatedData.education,
      experience: updatedData.experience,
      linkedin: updatedData.linkedin,
      github: updatedData.github,
      bio: updatedData.bio,
    };

    if (profileImageMeta) {
      profileUpdatePayload.profileImage = profileImageMeta;
    }

    if (resumeMeta) {
      profileUpdatePayload.resume = resumeMeta;
    }

    const updatedProfile = await SeekerProfile.findOneAndUpdate(
      { user: req.user.id },
      { $set: profileUpdatePayload, $setOnInsert: { user: req.user.id } },
      { new: true, upsert: true }
    );

    res.json({
      ...updatedUser.toObject(),
      name: updatedProfile.fullName || updatedUser.name || '',
      fullName: updatedProfile.fullName || updatedUser.name || '',
      phone: updatedProfile.phone || '',
      location: updatedProfile.location || '',
      skills: updatedProfile.skills || '',
      education: updatedProfile.education || '',
      experience: updatedProfile.experience || '',
      linkedin: updatedProfile.linkedin || '',
      github: updatedProfile.github || '',
      bio: updatedProfile.bio || '',
      profileImage: updatedProfile.profileImage?.url || '',
      profileImageMeta: updatedProfile.profileImage || null,
      resume: updatedProfile.resume?.url || '',
      resumeMeta: updatedProfile.resume || null,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error.message || 'Server Error',
    });
  }
};

const applyJob = async (req, res) => {
  try {
    const resumeFile = req.file || getFirstFile(req.files, 'resume');
    let resumeUrl = '';
    let job = null;

    if (req.body.jobId) {
      if (!mongoose.Types.ObjectId.isValid(req.body.jobId)) {
        return res.status(400).json({ message: 'Invalid job ID' });
      }

      job = await Job.findOne(getPublicJobVisibilityFilter(req.body.jobId));

      if (!job) {
        return res.status(404).json({ message: 'Active approved job not found' });
      }

      const existingApplication = await JobApplication.findOne({
        seeker: req.user.id,
        job: job._id,
      });

      if (existingApplication) {
        return res.status(400).json({ message: 'You have already applied to this job' });
      }
    }

    if (resumeFile) {
      const resumeMeta = await uploadToCloudinary(resumeFile, {
        folder: 'job-portal/applications',
        resourceType: 'raw',
      });
      resumeUrl = resumeMeta?.url || '';
    }

    const application = new JobApplication({
      seeker: req.user.id,
      job: job?._id || null,
      jobTitle: job?.title || req.body.jobTitle,
      coverLetter: req.body.coverLetter,
      resume: resumeUrl,
    });

    await application.save();

    if (job) {
      job.applications.addToSet(application._id);
      await job.save();
      await syncEmployerJobStats(job.company);
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      application,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: 'Server Error',
    });
  }
};

const getMyApplications = async (req, res) => {
  try {
    const applications = await JobApplication.find({
      seeker: req.user.id,
    })
      .populate('job', 'title company location status isApproved')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: 'Server Error',
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  applyJob,
  getMyApplications,
};
