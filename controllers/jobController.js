const mongoose = require('mongoose');
const Job = require('../models/Job');
const EmployerProfile = require('../models/EmployerProfile');
const JobApplication = require('../models/JobApplication');

const buildPublicJobFilter = (query) => {
  const { search, location, jobType, experienceLevel, company } = query;
  const filter = {
    status: 'active',
    // Treat legacy active jobs without an approval flag as public,
    // but keep explicitly pending/rejected jobs hidden.
    isApproved: { $ne: false },
  };

  if (company) {
    filter.company = company;
  }

  if (search) {
    const searchRegex = { $regex: search.trim(), $options: 'i' };
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { location: searchRegex },
      { skills: searchRegex },
    ];
  }

  if (location) {
    filter.location = { $regex: location.trim(), $options: 'i' };
  }

  if (jobType) {
    filter.jobType = jobType;
  }

  if (experienceLevel) {
    filter.experienceLevel = experienceLevel;
  }

  return filter;
};

exports.getPublicJobs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 9, 1), 30);
    const skip = (page - 1) * limit;
    const filter = buildPublicJobFilter(req.query);

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate('company', 'name email')
        .select('-approvalNotes -approvedBy -applications')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(filter),
    ]);

    res.json({
      jobs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getPublicJobSnapshot = async (req, res) => {
  try {
    const publicJobFilter = buildPublicJobFilter({});
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [openJobs, employers, recentApplications, featuredJobs] = await Promise.all([
      Job.countDocuments(publicJobFilter),
      EmployerProfile.countDocuments({
        $or: [
          { isVerified: true },
          { verificationStatus: 'approved' },
        ],
      }),
      JobApplication.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      }),
      Job.find(publicJobFilter)
        .populate('company', 'name email')
        .select('title company location jobType salary createdAt')
        .sort({ createdAt: -1 })
        .limit(3),
    ]);

    res.json({
      metrics: {
        openJobs,
        employers,
        recentApplications,
      },
      featuredJobs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getPublicJobById = async (req, res) => {
  try {
    const jobId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'Invalid job ID' });
    }

    const job = await Job.findOne({
      _id: jobId,
      status: 'active',
      isApproved: { $ne: false },
    })
      .populate('company', 'name email')
      .select('-approvalNotes -approvedBy -applications');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json({ job });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
