const mongoose = require('mongoose');
const ApplicationStage = require('../models/ApplicationStage');
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const User = require('../models/User');

// ─── Search Applications ──────────────────────────────────────────
const searchApplications = async (req, res) => {
  try {
    const {
      search = '',
      stage = '',
      jobId = '',
      dateFrom = '',
      dateTo = '',
      status = '',
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    // Check permissions
    if (req.user.role !== 'admin') {
      filter.employer = new mongoose.Types.ObjectId(req.user.id);
    }

    // Build filter
    if (stage) {
      filter.stage = stage;
    }

    if (jobId) {
      filter.job = new mongoose.Types.ObjectId(jobId);
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // Active applications only
    filter.isActive = true;

    // Search filter
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { 'seeker.name': { $regex: searchRegex } },
        { 'seeker.email': { $regex: searchRegex } },
        { 'job.title': { $regex: searchRegex } },
        { 'notes': { $regex: searchRegex } },
      ];
    }

    // Status filter (mapped from stage)
    if (status) {
      const stageMapping = {
        Pending: ['Applied', 'Screening'],
        Reviewing: ['Reviewing'],
        Shortlisted: ['Shortlisted'],
        Interview: ['Interview Scheduled', 'Assessment'],
        Accepted: ['Offer Extended', 'Accepted'],
        Rejected: ['Rejected', 'Withdrawn'],
      };
      filter.stage = { $in: stageMapping[status] || [status] };
    }

    const skip = (page - 1) * limit;

    // Get last active stage for each application
    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: '$application',
          doc: { $last: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$doc' } },
      {
        $lookup: {
          from: 'users',
          localField: 'seeker',
          foreignField: '_id',
          pipeline: [{ $project: { name: 1, email: 1, avatar: 1, phone: 1 } }],
          as: 'seeker',
        },
      },
      { $unwind: { path: '$seeker', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'jobs',
          localField: 'job',
          foreignField: '_id',
          pipeline: [
            { $project: { title: 1, companyName: 1, location: 1, employmentType: 1, salary: 1 } },
          ],
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
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: parseInt(limit) }],
        },
      },
    ];

    const result = await ApplicationStage.aggregate(pipeline);

    const applications = result[0]?.data || [];
    const total = result[0]?.metadata[0]?.total || 0;

    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Search Applications Error:', error);
    res.status(500).json({ success: false, message: 'Failed to search applications' });
  }
};

// ─── Get Saved Views (Filter Presets) ──────────────────────────────
const getSavedViews = async (req, res) => {
  try {
    // TODO: Implement saved views in database
    // For now, return empty array
    const views = [];

    res.json({
      success: true,
      data: views,
    });
  } catch (error) {
    console.error('Get Saved Views Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch saved views' });
  }
};

// ─── Save View ────────────────────────────────────────────────────
const saveView = async (req, res) => {
  try {
    // TODO: Implement save view functionality
    const { name, filters } = req.body;

    if (!name || !filters) {
      return res.status(400).json({
        success: false,
        message: 'View name and filters are required',
      });
    }

    // TODO: Save to database
    const view = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      filters,
      createdAt: new Date(),
    };

    res.status(201).json({
      success: true,
      message: 'View saved successfully',
      data: view,
    });
  } catch (error) {
    console.error('Save View Error:', error);
    res.status(500).json({ success: false, message: 'Failed to save view' });
  }
};

// ─── Export Pipeline as CSV ───────────────────────────────────────
const exportPipelineCSV = async (req, res) => {
  try {
    const { stage = '', jobId = '', status = '' } = req.query;

    const filter = { isActive: true };

    // Check permissions
    if (req.user.role !== 'admin') {
      filter.employer = new mongoose.Types.ObjectId(req.user.id);
    }

    if (stage) filter.stage = stage;
    if (jobId) filter.job = new mongoose.Types.ObjectId(jobId);

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: '$application',
          doc: { $last: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$doc' } },
      {
        $lookup: {
          from: 'users',
          localField: 'seeker',
          foreignField: '_id',
          pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }],
          as: 'seeker',
        },
      },
      { $unwind: { path: '$seeker', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'jobs',
          localField: 'job',
          foreignField: '_id',
          pipeline: [{ $project: { title: 1, companyName: 1 } }],
          as: 'job',
        },
      },
      { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
    ];

    const applications = await ApplicationStage.aggregate(pipeline);

    // Generate CSV
    const csv = generateCSV(applications);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pipeline.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Export Pipeline Error:', error);
    res.status(500).json({ success: false, message: 'Failed to export pipeline' });
  }
};

// ─── Helper Function: Generate CSV ────────────────────────────────
const generateCSV = (applications) => {
  const headers = [
    'Candidate Name',
    'Email',
    'Phone',
    'Position',
    'Stage',
    'Company',
    'Applied Date',
    'Last Updated',
    'Notes',
  ];

  const rows = applications.map((app) => [
    app.seeker?.name || 'N/A',
    app.seeker?.email || 'N/A',
    app.seeker?.phone || 'N/A',
    app.job?.title || 'N/A',
    app.stage,
    app.job?.companyName || 'N/A',
    new Date(app.createdAt).toLocaleDateString(),
    new Date(app.updatedAt).toLocaleDateString(),
    `"${(app.notes || '').replace(/"/g, '""')}"`, // Escape quotes
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
};

// ─── Generate Hiring Report ───────────────────────────────────────
const generateHiringReport = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.body;

    const filter = { isActive: true };

    if (req.user.role !== 'admin') {
      filter.employer = new mongoose.Types.ObjectId(req.user.id);
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // Get all stages
    const stageData = await ApplicationStage.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$application',
          doc: { $last: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$doc' } },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get accepted applications
    const accepted = await ApplicationStage.countDocuments({ ...filter, stage: 'Accepted' });

    // Calculate time to hire
    const timeToHire = await ApplicationStage.aggregate([
      { $match: { ...filter, stage: { $in: ['Applied', 'Accepted'] } } },
      {
        $group: {
          _id: '$application',
          stages: { $push: { stage: '$stage', date: '$createdAt' } },
        },
      },
      {
        $project: {
          daysToHire: {
            $divide: [
              {
                $subtract: [
                  { $max: '$stages.date' },
                  { $min: '$stages.date' },
                ],
              },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDaysToHire: { $avg: '$daysToHire' },
          count: { $sum: 1 },
        },
      },
    ]);

    const report = {
      title: 'Hiring Report',
      dateRange: {
        from: dateFrom || 'All time',
        to: dateTo || 'Today',
      },
      summary: {
        totalApplications: stageData.reduce((sum, s) => sum + s.count, 0),
        acceptedOffers: accepted,
        averageTimeToHire: timeToHire[0]?.avgDaysToHire
          ? Math.round(timeToHire[0].avgDaysToHire)
          : 'N/A',
      },
      stageBreakdown: stageData,
      generatedAt: new Date().toLocaleString(),
    };

    // Generate PDF (mock - can be replaced with actual PDF generation)
    const csv = generateReportCSV(report);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hiring-report.csv"');
    res.send(csv);
  } catch (error) {
    console.error('Generate Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};

// ─── Helper: Generate Report CSV ──────────────────────────────────
const generateReportCSV = (report) => {
  const lines = [
    report.title,
    '',
    `Generated: ${report.generatedAt}`,
    `Date Range: ${report.dateRange.from} to ${report.dateRange.to}`,
    '',
    'SUMMARY',
    `Total Applications,${report.summary.totalApplications}`,
    `Accepted Offers,${report.summary.acceptedOffers}`,
    `Average Time to Hire,${report.summary.averageTimeToHire} days`,
    '',
    'STAGE BREAKDOWN',
    'Stage,Count',
    ...report.stageBreakdown.map((s) => `${s._id},${s.count}`),
  ];

  return lines.join('\n');
};

// ─── Get Employer's Candidates (List All) ────────────────────────
const getEmployerCandidates = async (req, res) => {
  try {
    const { stage, page = 1, limit = 20 } = req.query;

    const filter = {
      employer: new mongoose.Types.ObjectId(req.user.id),
      isActive: true,
    };

    if (stage) {
      filter.stage = stage;
    }

    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: '$application',
          doc: { $last: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$doc' } },
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
          pipeline: [{ $project: { title: 1 } }],
          as: 'job',
        },
      },
      { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: parseInt(limit) }],
        },
      },
    ];

    const result = await ApplicationStage.aggregate(pipeline);

    const candidates = result[0]?.data || [];
    const total = result[0]?.metadata[0]?.total || 0;

    res.json({
      success: true,
      data: {
        candidates,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get Employer Candidates Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch candidates' });
  }
};

module.exports = {
  searchApplications,
  getSavedViews,
  saveView,
  exportPipelineCSV,
  generateHiringReport,
  getEmployerCandidates,
};
