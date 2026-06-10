const SeekerProfile = require('../models/SeekerProfile');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');

// ─── Helpers ────────────────────────────────────────────────────

const parseSkills = (skillStr) => {
  if (!skillStr) return [];
  return skillStr
    .split(/[,;|]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
};

const normalizeSkill = (s) => s.trim().toLowerCase().replace(/[^a-z0-9+#\s]/g, '');

const experienceToLevel = (text) => {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes('senior') || t.includes('lead') || t.includes('principal') || t.includes('architect')) return 'Senior';
  if (t.includes('mid') || t.includes('intermediate')) return 'Mid';
  if (t.includes('entry') || t.includes('junior') || t.includes('fresher')) return 'Entry';
  const yearsMatch = t.match(/(\d+)/);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1]);
    if (years >= 5) return 'Senior';
    if (years >= 2) return 'Mid';
    return 'Entry';
  }
  return 'Mid';
};

const levelToNum = (level) => {
  const map = { Entry: 1, Mid: 2, Senior: 3 };
  return map[level] || 2;
};

const educationLevel = (text) => {
  if (!text) return 0;
  const t = text.toLowerCase();
  if (t.includes('phd') || t.includes('doctorate') || t.includes('ph.d')) return 5;
  if (t.includes('master') || t.includes('mba') || t.includes('m.s') || t.includes('m.a') || t.includes('mtech') || t.includes('m.eng')) return 4;
  if (t.includes('bachelor') || t.includes('b.s') || t.includes('b.a') || t.includes('btech') || t.includes('b.eng') || t.includes('b.e') || t.includes('degree')) return 3;
  if (t.includes('diploma') || t.includes('associate')) return 2;
  if (t.includes('high school') || t.includes('secondary')) return 1;
  if (t === "bachelor's" || t === "master's" || t === "bachelor's degree" || t === "master's degree") {
    if (t.includes('master')) return 4;
    return 3;
  }
  return 2;
};

const locationMatch = (seekerLoc, jobLoc) => {
  if (!seekerLoc || !jobLoc) return 0.5;
  const s = seekerLoc.toLowerCase().trim();
  const j = jobLoc.toLowerCase().trim();
  if (s === j) return 1;
  if (j.includes('remote') || j.includes('anywhere')) return 1;
  if (s.includes('remote')) return 0.8;
  const sParts = s.split(/[,\s]+/).filter(Boolean);
  const jParts = j.split(/[,\s]+/).filter(Boolean);
  const overlap = sParts.filter((p) => jParts.includes(p));
  if (overlap.length > 0) return 0.8;
  if (sParts[0] === jParts[0]) return 0.7;
  return 0.3;
};

// ─── Skill Similarity (Jaccard + Weighted) ──────────────────────

const skillSimilarity = (seekerSkills, jobSkills) => {
  if (!seekerSkills.length || !jobSkills.length) return 0;
  const sSet = new Set(seekerSkills.map(normalizeSkill));
  const jSet = new Set(jobSkills.map(normalizeSkill));
  let matched = 0;
  for (const js of jSet) {
    for (const ss of sSet) {
      if (js === ss || js.includes(ss) || ss.includes(js)) {
        matched++;
        break;
      }
    }
  }
  const jaccard = matched / new Set([...sSet, ...jSet]).size;
  const coverage = matched / jSet.size;
  return jaccard * 0.4 + coverage * 0.6;
};

// ─── Feature 1: Job Recommendations for Seeker ──────────────────

const calculateJobMatchScore = (profile, job) => {
  const seekerSkills = parseSkills(profile.skills);
  const jobSkills = (job.skills || []).map((s) => s.toLowerCase());

  const skillsScore = skillSimilarity(seekerSkills, jobSkills);

  const seekerLevel = experienceToLevel(profile.experience);
  const jobLevel = job.experienceLevel;
  let experienceScore = 0;
  if (seekerLevel && jobLevel) {
    const diff = Math.abs(levelToNum(seekerLevel) - levelToNum(jobLevel));
    experienceScore = diff === 0 ? 1 : diff === 1 ? 0.6 : 0.2;
  } else {
    experienceScore = 0.5;
  }

  const locationScore = locationMatch(profile.location, job.location);

  const eduScore = educationLevel(profile.education) >= 3 ? 0.9 : 0.6;

  const total = skillsScore * 0.40 + experienceScore * 0.25 + locationScore * 0.20 + eduScore * 0.15;
  return Math.round(Math.min(total * 100, 100));
};

const getJobRecommendations = async (seekerId, limit = 10) => {
  const profile = await SeekerProfile.findOne({ user: seekerId });
  if (!profile) return [];

  const appliedJobs = await JobApplication.find({ seeker: seekerId }).select('job');
  const appliedIds = new Set(appliedJobs.map((a) => a.job?.toString()).filter(Boolean));

  const jobs = await Job.find({
    status: 'active',
    isApproved: { $ne: false },
  }).populate('company', 'name');

  const scored = jobs
    .filter((j) => !appliedIds.has(j._id.toString()))
    .map((job) => ({
      job,
      matchScore: calculateJobMatchScore(profile, job),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return scored;
};

// ─── Feature 2: Candidate Fit Score for Employer ────────────────

const calculateCandidateFitScore = (profile, job) => {
  const seekerSkills = parseSkills(profile.skills);
  const jobSkills = (job.skills || []).map((s) => s.toLowerCase());

  const skillsScore = skillSimilarity(seekerSkills, jobSkills);

  const seekerLevel = experienceToLevel(profile.experience);
  const jobLevel = job.experienceLevel;
  let experienceScore = 0;
  if (seekerLevel && jobLevel) {
    const diff = Math.abs(levelToNum(seekerLevel) - levelToNum(jobLevel));
    experienceScore = diff === 0 ? 1 : diff === 1 ? 0.6 : 0.2;
  } else {
    experienceScore = 0.5;
  }

  const locationScore = locationMatch(profile.location, job.location);

  const eduScore = educationLevel(profile.education) >= 3 ? 0.9 : 0.6;

  const total = skillsScore * 0.40 + experienceScore * 0.25 + locationScore * 0.20 + eduScore * 0.15;
  return Math.round(Math.min(total * 100, 100));
};

const getCandidateFitScores = async (employerId) => {
  const jobs = await Job.find({ company: employerId, status: 'active' });
  if (!jobs.length) return [];

  const jobIds = jobs.map((j) => j._id);
  const applications = await JobApplication.find({ job: { $in: jobIds } });

  if (!applications.length) return [];

  const seekerIds = [...new Set(applications.map((a) => a.seeker?.toString()).filter(Boolean))];
  const profiles = await SeekerProfile.find({ user: { $in: seekerIds } });
  const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));
  const jobMap = new Map(jobs.map((j) => [j._id.toString(), j]));

  const results = applications.map((app) => {
    const profile = profileMap.get(app.seeker?.toString());
    const job = jobMap.get(app.job?.toString());
    if (!profile || !job) return null;
    return {
      applicationId: app._id,
      seekerId: app.seeker,
      jobId: app.job,
      jobTitle: job.title,
      fitScore: calculateCandidateFitScore(profile, job),
      status: app.status,
    };
  }).filter(Boolean);

  results.sort((a, b) => b.fitScore - a.fitScore);
  return results;
};

const getJobCandidateRanking = async (employerId, jobId) => {
  const job = await Job.findOne({ _id: jobId, company: employerId });
  if (!job) return null;

  const applications = await JobApplication.find({ job: jobId });
  if (!applications.length) return { job, candidates: [] };

  const seekerIds = applications.map((a) => a.seeker?.toString()).filter(Boolean);
  const profiles = await SeekerProfile.find({ user: { $in: seekerIds } });
  const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

  const candidates = applications
    .map((app) => {
      const profile = profileMap.get(app.seeker?.toString());
      if (!profile) return null;
      return {
        applicationId: app._id,
        seekerId: app.seeker,
        fitScore: calculateCandidateFitScore(profile, job),
        status: app.status,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.fitScore - a.fitScore);

  return { job, candidates };
};

module.exports = {
  getJobRecommendations,
  getCandidateFitScores,
  getJobCandidateRanking,
  calculateJobMatchScore,
  calculateCandidateFitScore,
};
