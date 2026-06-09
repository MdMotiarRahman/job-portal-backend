const Job = require("../models/Job");


// ============================
// GET PENDING JOBS
// ============================

exports.getPendingJobs = async (req, res) => {

  try {

    const jobs = await Job.find({
      status: "pending",
    }).populate(
      "employer",
      "name email"
    );

    res.status(200).json(jobs);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};


// ============================
// APPROVE JOB
// ============================

exports.approveJob = async (req, res) => {

  try {

    const job = await Job.findById(
      req.params.id
    );

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    job.status = "approved";

    await job.save();

    const newEmployerId = job.company?.toString();
    await syncEmployerJobStats(newEmployerId);
    if (oldEmployerId && oldEmployerId !== newEmployerId) {
      await syncEmployerJobStats(oldEmployerId);
    }

    const populatedJob = await Job.findById(job._id)
      .populate('company', 'name email')
      .populate('approvedBy', 'name email');

    res.json({
      message: 'Job updated successfully',
      job: populatedJob,
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

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'Invalid job ID' });
    }

    console.log('Admin approving job:', jobId);

    const job = await Job.findByIdAndUpdate(
      jobId,
      {
        $set: {
          isApproved: true,
          status: 'active',
          approvedBy: req.user.id,
          approvalNotes: notes || '',
        },
      },
      { new: true, runValidators: true }
    )
      .populate('company', 'name email')
      .populate('approvedBy', 'name email');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    await syncEmployerJobStats(job.company?._id || job.company);

    console.log('Job approved successfully:', {
      id: job._id,
      title: job.title,
      isApproved: job.isApproved,
      status: job.status,
    });

    res.json({
      message: 'Job approved successfully',
      job,
    });
  } catch (err) {
    console.error('Approve job error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }

};


// ============================
// REJECT JOB
// ============================

exports.rejectJob = async (req, res) => {

  try {
    const jobId = req.params.id;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'Invalid job ID' });
    }

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const job = await Job.findByIdAndUpdate(
      jobId,
      {
        $set: {
          isApproved: false,
          status: 'inactive',
          approvedBy: null,
          approvalNotes: reason,
        },
      },
      { new: true, runValidators: true }
    )
      .populate('company', 'name email')
      .populate('approvedBy', 'name email');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    await syncEmployerJobStats(job.company?._id || job.company);

    res.json({
      message: 'Job rejected successfully',
      job,
    });
  } catch (err) {
    console.error('Reject job error:', err);
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

exports.reopenJob = async (req, res) => {
  try {
    const jobId = req.params.id;

    const job = await Job.findByIdAndUpdate(
      jobId,
      {
        status: 'active',
      },
      { new: true }
    );

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json({
      message: 'Job reopened successfully',
      job,
    });

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};