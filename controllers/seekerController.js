const User = require('../models/User');
const JobApplication = require('../models/JobApplication');

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

    if (req.file) {
      updatedData.profileImage = `http://localhost:5000/uploads/${req.file.filename}`;
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
    const application = new JobApplication({
      seeker: req.user.id,
      jobTitle: req.body.jobTitle,
      coverLetter: req.body.coverLetter,
      resume: req.file ? req.file.path : '',
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