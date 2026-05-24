const User = require('../models/User');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const SeekerProfile = require('../models/SeekerProfile');
const EmployerProfile = require('../models/EmployerProfile');
const bcrypt = require('bcryptjs');

// ============= ADMIN DASHBOARD STATS =============
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const bannedUsers = await User.countDocuments({ isBanned: true });
    const adminCount = await User.countDocuments({ role: 'admin' });
    const employerCount = await User.countDocuments({ role: 'employer' });
    const seekerCount = await User.countDocuments({ role: 'seeker' });

    const totalJobs = await Job.countDocuments();
    const approvedJobs = await Job.countDocuments({ isApproved: true });
    const pendingJobs = await Job.countDocuments({ isApproved: false });
    const activeJobs = await Job.countDocuments({ status: 'active' });

    const totalApplications = await JobApplication.countDocuments();
    const pendingApplications = await JobApplication.countDocuments({
      status: 'Pending',
    });

    const newUsersThisMonth = await User.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
      },
    });

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        banned: bannedUsers,
        admin: adminCount,
        employer: employerCount,
        seeker: seekerCount,
        newThisMonth: newUsersThisMonth,
      },
      jobs: {
        total: totalJobs,
        approved: approvedJobs,
        pending: pendingJobs,
        active: activeJobs,
      },
      applications: {
        total: totalApplications,
        pending: pendingApplications,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ============= USER MANAGEMENT =============
exports.getAllUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (role) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (status === 'banned') filter.isBanned = true;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get additional profile info based on role
    let profileData = {};
    if (user.role === 'seeker') {
      profileData = await SeekerProfile.findOne({ user: userId });
    } else if (user.role === 'employer') {
      profileData = await EmployerProfile.findOne({ user: userId });
    }

    res.json({
      user,
      profile: profileData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = new User({
      name,
      email,
      password,
      role,
      phone,
      isActive: true,
      isVerified: true,
      createdBy: req.user.id,
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Create profile based on role
    if (role === 'seeker') {
      await SeekerProfile.findOneAndUpdate(
        { user: user._id },
        {
          $setOnInsert: {
            user: user._id,
            fullName: user.name || '',
          },
        },
        { upsert: true }
      );
    } else if (role === 'employer') {
      await EmployerProfile.findOneAndUpdate(
        { user: user._id },
        {
          $setOnInsert: {
            user: user._id,
            companyName: name,
          },
        },
        { upsert: true }
      );
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, phone, location, adminNotes } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check email uniqueness if changing
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (location) user.location = location;
    if (adminNotes !== undefined) user.adminNotes = adminNotes;

    user.updatedBy = req.user.id;

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: user.toObject({ getters: true, virtuals: false }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Don't allow deleting the last admin
    if (userId === req.user.id) {
      return res
        .status(400)
        .json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Clean up related data
    if (user.role === 'seeker') {
      await SeekerProfile.deleteOne({ user: userId });
    } else if (user.role === 'employer') {
      await EmployerProfile.deleteOne({ user: userId });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ============= USER STATUS MANAGEMENT =============
exports.activateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isActive: true,
        isBanned: false,
        bannedAt: null,
        bannedReason: '',
        lockUntil: null,
        loginAttempts: 0,
        updatedBy: req.user.id,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User activated successfully',
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;

    if (userId === req.user.id) {
      return res
        .status(400)
        .json({ message: 'Cannot deactivate your own account' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isActive: false,
        updatedBy: req.user.id,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User deactivated successfully',
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.banUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Ban reason is required' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot ban your own account' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isBanned: true,
        isActive: false,
        bannedAt: new Date(),
        bannedReason: reason,
        updatedBy: req.user.id,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User banned successfully',
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.unbanUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isBanned: false,
        isActive: true,
        bannedAt: null,
        bannedReason: '',
        updatedBy: req.user.id,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User unbanned successfully',
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.verifyUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isVerified: true,
        verifiedAt: new Date(),
        updatedBy: req.user.id,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User verified successfully',
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ============= JOB MANAGEMENT =============
exports.getAllJobs = async (req, res) => {
  try {
    const { status, isApproved, search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (status) filter.status = status;
    if (isApproved !== undefined) filter.isApproved = isApproved === 'true';

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const jobs = await Job.find(filter)
      .populate('company', 'name email')
      .populate('approvedBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Job.countDocuments(filter);

    res.json({
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.approveJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const { notes } = req.body;

    const job = await Job.findByIdAndUpdate(
      jobId,
      {
        isApproved: true,
        approvedBy: req.user.id,
        approvalNotes: notes || '',
      },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json({
      message: 'Job approved successfully',
      job,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.rejectJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const job = await Job.findByIdAndUpdate(
      jobId,
      {
        isApproved: false,
        status: 'inactive',
        approvalNotes: reason,
      },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json({
      message: 'Job rejected successfully',
      job,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.closeJob = async (req, res) => {
  try {
    const jobId = req.params.id;

    const job = await Job.findByIdAndUpdate(
      jobId,
      {
        status: 'closed',
      },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json({
      message: 'Job closed successfully',
      job,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ============= JOB APPLICATION MANAGEMENT =============
exports.getAllApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (status) filter.status = status;

    const applications = await JobApplication.find(filter)
      .populate('seeker', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await JobApplication.countDocuments(filter);

    res.json({
      applications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const appId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Approved', 'Rejected', 'Hired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const application = await JobApplication.findByIdAndUpdate(
      appId,
      { status },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({
      message: 'Application status updated successfully',
      application,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ============= EMPLOYER VERIFICATION =============
exports.verifyEmployer = async (req, res) => {
  try {
    const employerId = req.params.id;

    const profile = await EmployerProfile.findOneAndUpdate(
      { user: employerId },
      {
        isVerified: true,
        verifiedAt: new Date(),
      },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: 'Employer profile not found' });
    }

    // Also verify the user
    await User.findByIdAndUpdate(employerId, { isVerified: true });

    res.json({
      message: 'Employer verified successfully',
      profile,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.rejectEmployerVerification = async (req, res) => {
  try {
    const employerId = req.params.id;
    const { reason } = req.body;

    const profile = await EmployerProfile.findOneAndUpdate(
      { user: employerId },
      {
        isVerified: false,
        verificationDocument: { url: '', publicId: '' },
      },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ message: 'Employer profile not found' });
    }

    res.json({
      message: 'Employer verification rejected',
      profile,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ============= ANALYTICS =============
exports.getAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let dateFilter;
    if (period === 'week') {
      dateFilter = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (period === 'month') {
      dateFilter = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    } else if (period === 'year') {
      dateFilter = { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) };
    }

    const newUsers = await User.countDocuments({
      createdAt: dateFilter,
    });

    const newJobs = await Job.countDocuments({
      createdAt: dateFilter,
    });

    const newApplications = await JobApplication.countDocuments({
      createdAt: dateFilter,
    });

    // Users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    // Jobs by status
    const jobsByStatus = await Job.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Applications by status
    const applicationsByStatus = await JobApplication.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      newUsers,
      newJobs,
      newApplications,
      usersByRole,
      jobsByStatus,
      applicationsByStatus,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
