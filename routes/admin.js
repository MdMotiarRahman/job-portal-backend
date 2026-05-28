const router = require("express").Router();

const adminController = require(
  "../controllers/adminController"
);

const {
  verifyToken,
  isAdmin,
} = require("../middleware/authMiddleware");


// ============================
// GET PENDING JOBS
// ============================

router.get(
  "/jobs/pending",
  [verifyToken, isAdmin],
  adminController.getPendingJobs
);


// ============================
// APPROVE JOB
// ============================

router.put(
  "/jobs/:id/approve",
  [verifyToken, isAdmin],
  adminController.approveJob
);


// ============================
// REJECT JOB
// ============================

router.put(
  "/jobs/:id/reject",
  [verifyToken, isAdmin],
  adminController.rejectJob
);


module.exports = router;