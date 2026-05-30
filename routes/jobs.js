const express = require('express');
const router = express.Router();
const {
  getPublicJobs,
  getPublicJobById,
} = require('../controllers/jobController');

router.get('/', getPublicJobs);
router.get('/:id', getPublicJobById);

module.exports = router;
