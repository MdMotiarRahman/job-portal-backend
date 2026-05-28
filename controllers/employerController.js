
const Job = require("../models/Job");

const JobApplication = require(
  "../models/jobapplication"
);


// ============================
// CREATE JOB
// ============================

exports.createJob = async (req, res) => {

  try {

    const {
      title,
      company,
      location,
      salary,
      type,
      description,
      requirements,
    } = req.body;

    const job = new Job({

      employer: req.userId,

      title,

      company,

      location,

      salary,

      type,

      description,

      requirements,

    });

    await job.save();

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      job,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};


// ============================
// GET EMPLOYER JOBS
// ============================

exports.getEmployerJobs = async (req, res) => {

  try {

    const jobs = await Job.find({
      employer: req.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json(jobs);

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};


// ============================
// GET JOB APPLICANTS
// ============================

exports.getJobApplicants = async (req, res) => {

  try {

    const jobId = req.params.jobId;

    // CHECK JOB
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    // SECURITY CHECK
    if (
      job.employer.toString() !==
      req.userId
    ) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    // FIND APPLICANTS
    const applicants =
      await JobApplication.find({
        job: jobId,
      })
      .populate(
        "seeker",
        "name email"
      )
      .populate(
        "job",
        "title company employer"
      )
      .sort({ createdAt: -1 });

    res.status(200).json(applicants);

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};


// ============================
// UPDATE APPLICATION STATUS
// ============================

exports.updateApplicationStatus =
  async (req, res) => {

  try {

    const {
      status,
      interviewDate,
      interviewTime,
      interviewMode,
      employerMessage,
    } = req.body;

    const application =
      await JobApplication.findById(
        req.params.applicationId
      )
      .populate("job");

    if (!application) {

      return res.status(404).json({
        message: "Application not found",
      });

    }

    // SECURITY CHECK
    if (
      application.job.employer.toString() !==
      req.userId
    ) {

      return res.status(403).json({
        message: "Access denied",
      });

    }

    // UPDATE STATUS
    if (status) {
      application.status = status;
    }

    // UPDATE INTERVIEW DETAILS
    if (interviewDate) {
      application.interviewDate =
        interviewDate;
    }

    if (interviewTime) {
      application.interviewTime =
        interviewTime;
    }

    if (interviewMode) {
      application.interviewMode =
        interviewMode;
    }

    // UPDATE MESSAGE
    if (employerMessage) {
      application.employerMessage =
        employerMessage;
    }

    await application.save();

    res.status(200).json({
      success: true,
      message:
        "Application updated successfully",
      application,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};