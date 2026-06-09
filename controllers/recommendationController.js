const {
  getJobRecommendations,
  getCandidateFitScores,
  getJobCandidateRanking,
} = require('../utils/recommendationService');

// GET /api/recommendations/jobs — Job recommendations for seeker
const getRecommendedJobs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const recommendations = await getJobRecommendations(req.user.id, limit);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Job recommendations error:', error);
    res.status(500).json({ success: false, message: 'Failed to load recommendations' });
  }
};

// GET /api/recommendations/candidates — Fit scores for employer's applications
const getCandidates = async (req, res) => {
  try {
    const candidates = await getCandidateFitScores(req.user.id);
    res.json({ success: true, data: candidates });
  } catch (error) {
    console.error('Candidate fit scores error:', error);
    res.status(500).json({ success: false, message: 'Failed to load candidate scores' });
  }
};

// GET /api/recommendations/candidates/:jobId — Ranked candidates for a specific job
const getJobCandidates = async (req, res) => {
  try {
    const result = await getJobCandidateRanking(req.user.id, req.params.jobId);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Job candidate ranking error:', error);
    res.status(500).json({ success: false, message: 'Failed to load candidate ranking' });
  }
};

module.exports = {
  getRecommendedJobs,
  getCandidates,
  getJobCandidates,
};
