const express = require("express");

const router = express.Router();

const {
  verifyToken,
  isEmployer,
} = require("../middleware/authMiddleware");

const employerController = require(
  "../controllers/employerController"
);


// ============================
// CREATE JOB
// ============================

router.post(
  "/jobs",
  verifyToken,
  isEmployer,
  employerController.createJob
);


// ============================
// GET EMPLOYER JOBS
// ============================

router.get(
  "/jobs",
  verifyToken,
  isEmployer,
  employerController.getEmployerJobs
);


// ============================
// GET JOB APPLICANTS
// ============================

router.get(
  "/applications/:jobId",
  verifyToken,
  isEmployer,
  employerController.getJobApplicants
);


// ============================
// UPDATE APPLICATION STATUS
// ============================

router.put(
  "/applications/:applicationId",
  verifyToken,
  isEmployer,
  employerController.updateApplicationStatus
);


module.exports = router;