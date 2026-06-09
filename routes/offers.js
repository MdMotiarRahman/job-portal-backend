const express = require('express');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const {
  createOffer,
  getOfferDetails,
  updateOffer,
  sendOffer,
  updateOfferStatus,
  withdrawOffer,
  getEmployerOffers,
  getCandidateOffers,
} = require('../controllers/offerController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create offer (employer, admin)
router.post('/', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, createOffer);

// Get offer details (admin, employer, seeker)
router.get('/:applicationId', getOfferDetails);

// Update offer (employer, admin - only draft offers)
router.put('/:offerId', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, updateOffer);

// Send offer (employer, admin)
router.post('/:offerId/send', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, sendOffer);

// Update offer status (seeker can accept/reject, employer/admin can view)
router.put('/:offerId/status', updateOfferStatus);

// Withdraw offer (employer, admin)
router.delete('/:offerId', (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}, withdrawOffer);

// Get employer's offers (employer only)
router.get('/my/offers/list', requireRole('employer'), getEmployerOffers);

// Get candidate's offers (seeker only)
router.get('/my/received', requireRole('seeker'), getCandidateOffers);

module.exports = router;
