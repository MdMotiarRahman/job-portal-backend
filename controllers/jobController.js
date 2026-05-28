const Job = require("../models/Job");


// ============================
// GET APPROVED JOBS
// ============================

exports.getApprovedJobs = async (req, res) => {

  try {

    const jobs = await Job.find({
      status: "approved",
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