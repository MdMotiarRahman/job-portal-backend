const mongoose = require('mongoose');
const ApplicationStage = require('../models/ApplicationStage');
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const User = require('../models/User');

// ─── Stage Configuration ──────────────────────────────────────────
const STAGES = [
  'Applied',
  'Screening',
  'Reviewing',
  'Shortlisted',
  'Interview Scheduled',
  'Assessment',
  'Offer Extended',
  'Accepted',
  'Rejected',
  'Withdrawn',
];

const STAGE_COLORS = {
  Applied: '#6B7280',
  Screening: '#3B82F6',
  Reviewing: '#8B5CF6',
  Shortlisted: '#F59E0B',
  'Interview Scheduled': '#EC4899',
  Assessment: '#14B8A6',
  'Offer Extended': '#10B981',
  Accepted: '#22C55E',
  Rejected: '#EF4444',
  Withdrawn: '#9CA3AF',
};

const VALID_TRANSITIONS = {
  Applied: ['Screening', 'Reviewing', 'Rejected', 'Withdrawn'],
  Screening: ['Reviewing', 'Shortlisted', 'Rejected', 'Withdrawn'],
  Reviewing: ['Shortlisted', 'Interview Scheduled', 'Rejected', 'Withdrawn'],
  Shortlisted: ['Interview Scheduled', 'Assessment', 'Rejected', 'Withdrawn'],
  'Interview Scheduled': ['Shortlisted', 'Assessment', 'Offer Extended', 'Rejected'],
  Assessment: ['Shortlisted', 'Interview Scheduled', 'Offer Extended', 'Rejected'],
  'Offer Extended': ['Accepted', 'Rejected', 'Withdrawn'],
  Accepted: [],
  Rejected: [],
  Withdrawn: [],
};

// ─── Helpers ──────────────────────────────────────────────────────
const buildApplicationFilter = async (req) => {
  const filter = {};
  const isAdmin = req.user.role === 'admin';

  if (!isAdmin) {
    // Get all job IDs owned by this employer
    const employerJobs = await Job.find({ company: req.user.id }).select('_id');
    const employerJobIds = employerJobs.map((j) => j._id);

    // Match by employer field OR by job belonging to this employer
    filter.$or = [
      { employer: req.user.id },
      { job: { $in: employerJobIds } },
    ];
  }

  if (req.query.jobId) {
    filter.job = req.query.jobId;
  }

  if (req.query.stage) {
    filter.stage = req.query.stage;
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { 'seeker.name': { $regex: searchRegex } },
        { 'seeker.email': { $regex: searchRegex } },
        { 'job.title': { $regex: searchRegex } },
      ],
    });
  }

  if (req.query.dateFrom || req.query.dateTo) {
    filter.createdAt = {};
    if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom);
    if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo);
  }

  return filter;
};

// ─── Auto-sync missing ApplicationStage records ───────────────────
const syncMissingApplicationStages = async (employerId = null) => {
  try {
    const jobFilter = employerId ? { company: employerId } : {};
    const jobs = await Job.find(jobFilter).select('_id company');
    const jobMap = {};
    jobs.forEach((j) => { jobMap[j._id.toString()] = j; });

    const jobIds = jobs.map((j) => j._id);
    if (jobIds.length === 0) {
      console.log(`ATS Sync: No jobs found for employer ${employerId || 'all'}`);
      return 0;
    }

    const existingStages = await ApplicationStage.find({ job: { $in: jobIds } }).select('application');
    const existingAppIds = new Set(existingStages.map((s) => s.application.toString()));

    const missingApps = await JobApplication.find({
      job: { $in: jobIds },
      _id: { $nin: Array.from(existingAppIds) },
    });

    console.log(`ATS Sync: Found ${jobs.length} jobs, ${existingStages.length} existing stages, ${missingApps.length} missing`);

    let created = 0;
    for (const app of missingApps) {
      const job = jobMap[app.job?.toString()];
      if (!job) continue;

      await ApplicationStage.create({
        application: app._id,
        job: app.job,
        seeker: app.seeker,
        employer: job.company || employerId || null,
        stage: 'Applied',
        previousStage: null,
        movedBy: app.seeker,
        movedByRole: 'system',
        notes: 'Auto-created during sync',
      });
      created++;
    }

    if (created > 0) {
      console.log(`ATS Sync: Created ${created} missing ApplicationStage records`);
    }
    return created;
  } catch (error) {
    console.error('ATS Sync Error:', error);
    return 0;
  }
};

const getActiveApplications = async (filter) => {
  return ApplicationStage.aggregate([
    { $match: { ...filter, isActive: true } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$application',
        doc: { $first: '$$ROOT' },
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: ['$doc', { _id: '$_id' }],
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'seeker',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1, email: 1, avatar: 1 } }],
        as: 'seeker',
      },
    },
    { $unwind: { path: '$seeker', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'jobs',
        localField: 'job',
        foreignField: '_id',
        pipeline: [{ $project: { title: 1, companyName: 1, location: 1, employmentType: 1 } }],
        as: 'job',
      },
    },
    { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'employer',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1, email: 1 } }],
        as: 'employer',
      },
    },
    { $unwind: { path: '$employer', preserveNullAndEmptyArrays: true } },
    { $sort: { updatedAt: -1 } },
  ]);
};

// ─── Pipeline Stats ───────────────────────────────────────────────
const getPipelineStats = async (req, res) => {
  try {
    // Auto-sync missing ApplicationStage records
    const employerId = req.user.role !== 'admin' ? req.user.id : null;
    await syncMissingApplicationStages(employerId);

    const filter = await buildApplicationFilter(req);
    const pipeline = [
      { $match: { ...filter, isActive: true } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$application',
          doc: { $first: '$$ROOT' },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ['$doc', { _id: '$_id' }],
          },
        },
      },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          seekers: { $push: '$_id' },
        },
      },
    ];

    const stageCounts = await ApplicationStage.aggregate(pipeline);
    const totalApplications = stageCounts.reduce((sum, s) => sum + s.count, 0);

    const stageBreakdown = {};
    STAGES.forEach((stage) => {
      const found = stageCounts.find((s) => s._id === stage);
      stageBreakdown[stage] = {
        count: found ? found.count : 0,
        percentage: totalApplications > 0 ? Math.round(((found ? found.count : 0) / totalApplications) * 100) : 0,
        color: STAGE_COLORS[stage],
      };
    });

    // Time-to-hire average (Applied → Accepted)
    const hireStages = await ApplicationStage.aggregate([
      {
        $group: {
          _id: '$application',
          stages: { $push: { stage: '$stage', createdAt: '$createdAt' } },
        },
      },
      {
        $project: {
          hasApplied: {
            $gt: [{ $size: { $filter: { input: '$stages', cond: { $eq: ['$$this.stage', 'Applied'] } } } }, 0],
          },
          hasAccepted: {
            $gt: [{ $size: { $filter: { input: '$stages', cond: { $eq: ['$$this.stage', 'Accepted'] } } } }, 0],
          },
          appliedDate: {
            $arrayElemAt: [
              {
                $map: {
                  input: { $filter: { input: '$stages', cond: { $eq: ['$$this.stage', 'Applied'] } } },
                  in: '$$this.createdAt',
                },
              },
              0,
            ],
          },
          acceptedDate: {
            $arrayElemAt: [
              {
                $map: {
                  input: { $filter: { input: '$stages', cond: { $eq: ['$$this.stage', 'Accepted'] } } },
                  in: '$$this.createdAt',
                },
              },
              0,
            ],
          },
        },
      },
      { $match: { hasApplied: true, hasAccepted: true } },
      {
        $project: {
          daysToHire: {
            $divide: [{ $subtract: ['$acceptedDate', '$appliedDate'] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      { $group: { _id: null, avgDays: { $avg: '$daysToHire' }, count: { $sum: 1 } } },
    ]);

    const avgTimeToHire = hireStages.length > 0 ? Math.round(hireStages[0].avgDays) : null;

    res.json({
      success: true,
      data: {
        totalApplications,
        stageBreakdown,
        avgTimeToHire,
      },
    });
  } catch (error) {
    console.error('ATS Pipeline Stats Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pipeline stats.' });
  }
};

// ─── Get Pipeline Board ───────────────────────────────────────────
const getPipelineBoard = async (req, res) => {
  try {
    // Auto-sync missing ApplicationStage records
    const employerId = req.user.role !== 'admin' ? req.user.id : null;
    await syncMissingApplicationStages(employerId);

    const filter = await buildApplicationFilter(req);
    const applications = await getActiveApplications(filter);

    // Group by stage
    const board = {};
    STAGES.forEach((stage) => {
      board[stage] = [];
    });

    applications.forEach((app) => {
      if (board[app.stage]) {
        board[app.stage].push(app);
      }
    });

    res.json({
      success: true,
      data: {
        board,
        total: applications.length,
        stageColors: STAGE_COLORS,
      },
    });
  } catch (error) {
    console.error('ATS Pipeline Board Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pipeline board.' });
  }
};

// ─── Move Application Stage ───────────────────────────────────────
const moveApplicationStage = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { stage, notes, interviewDate, interviewTime, interviewMode, interviewLocation, rejectionReason, offerDetails } = req.body;

    if (!STAGES.includes(stage)) {
      return res.status(400).json({ success: false, message: `Invalid stage. Must be one of: ${STAGES.join(', ')}` });
    }

    // Get current active stage — try by application field first, then by _id
    let currentStage = await ApplicationStage.findOne({
      application: applicationId,
      isActive: true,
    }).sort({ createdAt: -1 });

    if (!currentStage) {
      currentStage = await ApplicationStage.findOne({
        _id: applicationId,
        isActive: true,
      }).sort({ createdAt: -1 });
    }

    if (!currentStage) {
      return res.status(404).json({ success: false, message: 'Application not found in pipeline.' });
    }

    // Validate transition
    if (currentStage.stage === stage) {
      return res.status(400).json({ success: false, message: 'Application is already in this stage.' });
    }

    if (!VALID_TRANSITIONS[currentStage.stage]?.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move from "${currentStage.stage}" to "${stage}". Valid transitions: ${VALID_TRANSITIONS[currentStage.stage]?.join(', ') || 'None'}`,
      });
    }

    // Deactivate current stage
    currentStage.isActive = false;
    await currentStage.save();

    // Create new stage
    const newStage = await ApplicationStage.create({
      application: applicationId,
      job: currentStage.job,
      seeker: currentStage.seeker,
      employer: currentStage.employer,
      stage,
      previousStage: currentStage.stage,
      movedBy: req.user.id,
      movedByRole: req.user.role,
      notes: notes || '',
      interviewDate: interviewDate || null,
      interviewTime: interviewTime || '',
      interviewMode: interviewMode || '',
      interviewLocation: interviewLocation || '',
      rejectionReason: rejectionReason || '',
      offerDetails: offerDetails || {},
    });

    // Update JobApplication status
    await JobApplication.findByIdAndUpdate(applicationId, {
      status: mapStageToStatus(stage),
    });

    res.status(201).json({
      success: true,
      message: `Application moved to "${stage}".`,
      data: newStage,
    });
  } catch (error) {
    console.error('Move Application Stage Error:', error);
    res.status(500).json({ success: false, message: 'Failed to move application stage.' });
  }
};

// ─── Bulk Move Applications ───────────────────────────────────────
const bulkMoveApplications = async (req, res) => {
  try {
    const { applicationIds, stage, notes } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ success: false, message: 'applicationIds array is required.' });
    }

    if (!STAGES.includes(stage)) {
      return res.status(400).json({ success: false, message: `Invalid stage. Must be one of: ${STAGES.join(', ')}` });
    }

    const results = [];
    const errors = [];

    for (const applicationId of applicationIds) {
      try {
        const currentStage = await ApplicationStage.findOne({
          application: applicationId,
          isActive: true,
        }).sort({ createdAt: -1 });

        if (!currentStage) {
          errors.push({ applicationId, error: 'Not found in pipeline' });
          continue;
        }

        if (!VALID_TRANSITIONS[currentStage.stage]?.includes(stage)) {
          errors.push({
            applicationId,
            error: `Cannot move from "${currentStage.stage}" to "${stage}"`,
          });
          continue;
        }

        currentStage.isActive = false;
        await currentStage.save();

        const newStage = await ApplicationStage.create({
          application: applicationId,
          job: currentStage.job,
          seeker: currentStage.seeker,
      employer: currentStage.employer || req.user.id,
          stage,
          previousStage: currentStage.stage,
          movedBy: req.user.id,
          movedByRole: req.user.role,
          notes: notes || '',
        });

        await JobApplication.findByIdAndUpdate(applicationId, {
          status: mapStageToStatus(stage),
        });

        results.push({ applicationId, stage });
      } catch (err) {
        errors.push({ applicationId, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `${results.length} applications moved to "${stage}".`,
      data: { results, errors },
    });
  } catch (error) {
    console.error('Bulk Move Applications Error:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk move applications.' });
  }
};

// ─── Get Stage History ────────────────────────────────────────────
const getStageHistory = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const history = await ApplicationStage.find({ application: applicationId })
      .populate('movedBy', 'name email role')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Get Stage History Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stage history.' });
  }
};

// ─── Get Employer's ATS Summary ───────────────────────────────────
const getEmployerATSStats = async (req, res) => {
  try {
    const employerFilter = { employer: new mongoose.Types.ObjectId(req.user.id), isActive: true };

    const pipeline = [
      { $match: employerFilter },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$application',
          doc: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$doc' } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byStage: {
            $push: { stage: '$stage', appId: '$application' },
          },
        },
      },
    ];

    const result = await ApplicationStage.aggregate(pipeline);

    if (result.length === 0) {
      return res.json({
        success: true,
        data: {
          totalApplications: 0,
          stageBreakdown: STAGES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {}),
          recentActivity: [],
        },
      });
    }

    const breakdown = {};
    STAGES.forEach((s) => (breakdown[s] = 0));
    result[0].byStage.forEach((item) => {
      breakdown[item.stage] = (breakdown[item.stage] || 0) + 1;
    });

    // Recent activity
    const recentActivity = await ApplicationStage.find(employerFilter)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('seeker', 'name email')
      .populate('job', 'title')
      .lean();

    res.json({
      success: true,
      data: {
        totalApplications: result[0].total,
        stageBreakdown: breakdown,
        recentActivity,
      },
    });
  } catch (error) {
    console.error('Employer ATS Stats Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch ATS stats.' });
  }
};

// ─── Auto-create stage on application ─────────────────────────────
const initializeApplicationStage = async (application) => {
  try {
    const job = await Job.findById(application.job);
    await ApplicationStage.create({
      application: application._id,
      job: application.job,
      seeker: application.seeker,
      employer: job?.company || null,
      stage: 'Applied',
      previousStage: null,
      movedBy: application.seeker,
      movedByRole: 'system',
    });
  } catch (error) {
    console.error('Initialize Application Stage Error:', error);
  }
};

// ─── Stage-to-Status Mapping ──────────────────────────────────────
const mapStageToStatus = (stage) => {
  const mapping = {
    Applied: 'Pending',
    Screening: 'Pending',
    Reviewing: 'Reviewing',
    Shortlisted: 'Shortlisted',
    'Interview Scheduled': 'Interview Scheduled',
    Assessment: 'Interview Scheduled',
    'Offer Extended': 'Accepted',
    Accepted: 'Accepted',
    Rejected: 'Rejected',
    Withdrawn: 'Rejected',
  };
  return mapping[stage] || 'Pending';
};

// ─── Status-to-Stage Mapping (reverse) ────────────────────────────
const mapStatusToStage = (status) => {
  const mapping = {
    Pending: 'Applied',
    Reviewing: 'Reviewing',
    Shortlisted: 'Shortlisted',
    'Interview Scheduled': 'Interview Scheduled',
    Accepted: 'Accepted',
    Rejected: 'Rejected',
  };
  return mapping[status] || null;
};

module.exports = {
  STAGES,
  STAGE_COLORS,
  VALID_TRANSITIONS,
  getPipelineStats,
  getPipelineBoard,
  moveApplicationStage,
  bulkMoveApplications,
  getStageHistory,
  getEmployerATSStats,
  initializeApplicationStage,
  mapStageToStatus,
  mapStatusToStage,
};
