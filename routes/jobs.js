const router = require("express").Router();

const jobController = require(
  "../controllers/jobController"
);


// ============================
// GET APPROVED JOBS
// ============================

router.get(
  "/",
  jobController.getApprovedJobs
);


module.exports = router;