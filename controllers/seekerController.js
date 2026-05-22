const fs = require('fs');
const User = require('../models/User');
const JobApplication = require('../models/JobApplication');
const configureCloudinary = require('../config/cloudinary');

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
  if (!file) return '';

  const cloudinary = getCloudinaryClient();
  const uploadOptions = {
    folder: options.folder,
    resource_type: options.resourceType || 'image',
  };

  try {
    const result = await cloudinary.uploader.upload(file.path, uploadOptions);
    return result.secure_url;
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

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    res.json(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: 'Server Error',
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const updatedData = {
      name: req.body.fullName || '',
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

    if (profileImageFile) {
      updatedData.profileImage = await uploadToCloudinary(profileImageFile, {
        folder: 'job-portal/profiles',
        resourceType: 'image',
      });
    }

    if (resumeFile) {
      updatedData.resume = await uploadToCloudinary(resumeFile, {
        folder: 'job-portal/resumes',
        resourceType: 'image',
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updatedData,
      { new: true }
    ).select('-password');

    res.json(updatedUser);
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

    if (resumeFile) {
      resumeUrl = await uploadToCloudinary(resumeFile, {
        folder: 'job-portal/applications',
        resourceType: 'image',
      });
    }

    const application = new JobApplication({
      seeker: req.user.id,
      jobTitle: req.body.jobTitle,
      coverLetter: req.body.coverLetter,
      resume: resumeUrl,
    });

    await application.save();

    res.status(201).json({
      message: 'Application submitted successfully',
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
    }).sort({ createdAt: -1 });

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
