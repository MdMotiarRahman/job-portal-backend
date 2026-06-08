const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const ApplicationStage = require('../models/ApplicationStage');
const connectDB = require('../config/db');

const EMPLOYER_EMAIL = 'siyum22205101837@diu.edu.bd';
const SEEKER_EMAIL = 'jubairprogprodigy@gmail.com';

async function seed() {
  await connectDB();

  // 1. Find users
  const employer = await User.findOne({ email: EMPLOYER_EMAIL });
  const seeker = await User.findOne({ email: SEEKER_EMAIL });

  if (!employer) {
    console.error(`Employer not found: ${EMPLOYER_EMAIL}`);
    process.exit(1);
  }
  if (!seeker) {
    console.error(`Seeker not found: ${SEEKER_EMAIL}`);
    process.exit(1);
  }

  console.log(`Employer: ${employer.name} (${employer._id})`);
  console.log(`Seeker:   ${seeker.name} (${seeker._id})`);

  // 2. Create a fresh job
  const job = await Job.create({
    title: 'Senior React Developer',
    description: 'We are looking for an experienced React developer to join our frontend team. You will build modern web applications using React, TypeScript, and GraphQL.',
    company: employer._id,
    location: 'Dhaka, Bangladesh',
    jobType: 'Full-time',
    experienceLevel: 'Senior',
    salary: { min: 80000, max: 120000, currency: 'USD' },
    skills: ['React', 'TypeScript', 'GraphQL', 'Node.js', 'CSS'],
    requirements: ['5+ years of experience', 'Strong portfolio', 'Team leadership'],
    status: 'active',
    isApproved: true,
    approvedBy: employer._id,
    approvalNotes: 'Approved for testing',
  });
  console.log(`\nJob created: ${job.title} (${job._id})`);

  // 3. Create a fresh application
  const application = await JobApplication.create({
    seeker: seeker._id,
    job: job._id,
    jobTitle: job.title,
    coverLetter: 'I am a Senior React Developer with 6 years of experience building modern web applications. I am passionate about clean code and user-centric design.',
    resume: '',
    status: 'Pending',
  });
  console.log(`Application created: ${application._id}`);

  // 4. Link application to job
  job.applications.push(application._id);
  await job.save();
  console.log(`Application linked to job`);

  // 5. Create ApplicationStage record
  const stage = await ApplicationStage.create({
    application: application._id,
    job: job._id,
    seeker: seeker._id,
    employer: employer._id,
    stage: 'Applied',
    previousStage: null,
    movedBy: seeker._id,
    movedByRole: 'system',
    notes: 'Initial application',
    isActive: true,
  });
  console.log(`ApplicationStage created: ${stage._id} (stage: ${stage.stage})`);

  // 6. Verify
  const verifyStages = await ApplicationStage.find({ employer: employer._id, isActive: true });
  console.log(`\n--- Verification ---`);
  console.log(`Active ApplicationStage records for this employer: ${verifyStages.length}`);
  verifyStages.forEach((s) => {
    console.log(`  - Application: ${s.application}, Stage: ${s.stage}`);
  });

  console.log('\nSeed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
