const Job = require("../models/Job");


// ============================
// GET PENDING JOBS
// ============================

exports.getPendingJobs = async (req, res) => {

  try {

    const jobs = await Job.find({
      status: "pending",
    }).populate(
      "employer",
      "name email"
    );

    res.status(200).json(jobs);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};


// ============================
// APPROVE JOB
// ============================

exports.approveJob = async (req, res) => {

  try {

    const job = await Job.findById(
      req.params.id
    );

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    job.status = "approved";

    await job.save();

    res.status(200).json({
      message: "Job approved successfully",
      job,
    });

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};


// ============================
// REJECT JOB
// ============================

exports.rejectJob = async (req, res) => {

  try {

    const job = await Job.findById(
      req.params.id
    );

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    job.status = "rejected";

    await job.save();

    res.status(200).json({
      message: "Job rejected successfully",
      job,
    });

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};