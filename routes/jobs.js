const express = require('express');
const router = express.Router();
const {
  getPublicJobs,
  getPublicJobSnapshot,
  getPublicJobById,
} = require('../controllers/jobController');

router.get('/', getPublicJobs);
router.get('/snapshot', getPublicJobSnapshot);
router.get('/:id', getPublicJobById);

module.exports = router;
