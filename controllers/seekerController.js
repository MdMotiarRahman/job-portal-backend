const User = require("../models/User");
const Job = require("../models/Job");
const JobApplication = require("../models/jobapplication");


// ============================
// GET MY PROFILE
// ============================

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