/**
 * Email Templates Test Script
 *
 * Fetches real data from MongoDB and sends all email templates at once.
 * Check your inbox (or console) to preview every template.
 *
 * Usage:
 *   node scripts/test-emails.js                     # sends to EMAIL_TO (default: yourself)
 *   node scripts/test-emails.js you@example.com     # sends to a specific address
 *   node scripts/test-emails.js --console            # logs HTML to console, no sending
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const { sendEmail, getEmailSubject, getEmailTemplate } = require('../utils/emailService');
const User = require('../models/User');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const ApplicationStage = require('../models/ApplicationStage');
const EmployerProfile = require('../models/EmployerProfile');
const Interview = require('../models/Interview');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ─── Parse CLI args ───────────────────────────────────────────────

const args = process.argv.slice(2);
const consoleMode = args.includes('--console');
const customEmail = args.find((a) => !a.startsWith('--'));
const EMAIL_TO = customEmail || 'test@localhost';

// ─── Helpers ──────────────────────────────────────────────────────

const divider = (label) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${'='.repeat(60)}`);
};

const formatDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log('Connecting to database...');
  await connectDB();
  console.log('Connected.\n');

  // Fetch real data
  const employers = await User.find({ role: 'employer' }).limit(3).lean();
  const seekers = await User.find({ role: 'seeker' }).limit(3).lean();
  const admin = await User.findOne({ role: 'admin' }).lean();

  const employerIds = employers.map((e) => e._id);
  const seekerIds = seekers.map((s) => s._id);

  const jobs = await Job.find({ company: { $in: employerIds } }).limit(3).lean();
  const applications = await JobApplication.find({ seeker: { $in: seekerIds } }).limit(3).lean();
  const interviews = await Interview.find({ seeker: { $in: seekerIds } }).limit(2).lean();
  const stages = await ApplicationStage.find({ employer: { $in: employerIds } }).limit(3).lean();

  // Build lookup maps
  const jobMap = {};
  jobs.forEach((j) => { jobMap[j._id.toString()] = j; });

  const appMap = {};
  applications.forEach((a) => { appMap[a._id.toString()] = a; });

  const employerMap = {};
  employers.forEach((e) => { employerMap[e._id.toString()] = e; });

  const seekerMap = {};
  seekers.forEach((s) => { seekerMap[s._id.toString()] = s; });

  divider('DATA SUMMARY');
  console.log(`Employers: ${employers.length}`);
  employers.forEach((e) => console.log(`  - ${e.name} (${e.email})`));
  console.log(`Seekers: ${seekers.length}`);
  seekers.forEach((s) => console.log(`  - ${s.name} (${s.email})`));
  console.log(`Jobs: ${jobs.length}`);
  jobs.forEach((j) => console.log(`  - ${j.title} (by ${employerMap[j.company?.toString()]?.name || 'Unknown'})`));
  console.log(`Applications: ${applications.length}`);
  console.log(`Interviews: ${interviews.length}`);
  console.log(`ApplicationStages: ${stages.length}`);

  // When a custom email is specified, send ALL emails to that address
  const resolveEmail = (original) => (customEmail ? EMAIL_TO : original);

  // Build email data from real records
  const firstEmployer = employers[0] || { name: 'Employer', email: EMAIL_TO };
  const firstSeeker = seekers[0] || { name: 'Candidate', email: EMAIL_TO };
  const firstJob = jobs[0] || { title: 'Software Engineer' };
  const firstApp = applications[0] || {};
  const firstInterview = interviews[0] || null;
  const firstStage = stages[0] || null;

  const emailData = [
    // ── 1. New Application ──────────────────────────────────────
    {
      template: 'reminderNewApplication',
      to: resolveEmail(firstEmployer.email),
      data: {
        employerName: firstEmployer.name,
        jobTitle: firstJob.title,
        applicantName: firstSeeker.name,
        applicantEmail: firstSeeker.email,
        applicationLink: `${FRONTEND_URL}/employer/applications`,
      },
    },

    // ── 2. Interview Scheduled ──────────────────────────────────
    {
      template: 'reminderInterviewScheduled',
      to: resolveEmail(firstSeeker.email),
      data: {
        seekerName: firstSeeker.name,
        companyName: employerMap[firstJob.company?.toString()]?.name || 'TechCorp',
        jobTitle: firstJob.title,
        interviewDate: firstInterview ? formatDateTime(firstInterview.date) : daysFromNow(3),
        interviewTime: firstInterview?.time || '10:00 AM',
        interviewMode: firstInterview?.mode || 'Video',
        daysUntil: 3,
        applicationLink: `${FRONTEND_URL}/seeker/applications`,
      },
    },

    // ── 3. Application Status Update ────────────────────────────
    {
      template: 'reminderApplicationStatusUpdate',
      to: resolveEmail(firstSeeker.email),
      data: {
        seekerName: firstSeeker.name,
        jobTitle: firstJob.title,
        companyName: employerMap[firstJob.company?.toString()]?.name || 'TechCorp',
        status: firstStage?.stage || 'Shortlisted',
        message: firstStage?.notes || 'We were impressed with your application and would like to move forward.',
      },
    },

    // ── 4. Job Deadline Approaching ─────────────────────────────
    {
      template: 'reminderJobDeadline',
      to: resolveEmail(firstSeeker.email),
      data: {
        seekerName: firstSeeker.name,
        jobTitle: firstJob.title,
        companyName: employerMap[firstJob.company?.toString()]?.name || 'TechCorp',
        deadline: formatDate(firstJob.applicationDeadline || new Date(Date.now() + 2 * 86400000)),
        daysRemaining: 2,
        jobLink: `${FRONTEND_URL}/jobs`,
      },
    },

    // ── 5. Job Expiring ─────────────────────────────────────────
    {
      template: 'reminderJobExpiring',
      to: resolveEmail(firstEmployer.email),
      data: {
        employerName: firstEmployer.name,
        jobTitle: firstJob.title,
        expiryDate: formatDate(firstJob.expiryDate || new Date(Date.now() + 3 * 86400000)),
        daysRemaining: 3,
        renewLink: `${FRONTEND_URL}/employer/jobs`,
      },
    },

    // ── 6. Pending Applications ─────────────────────────────────
    {
      template: 'reminderPendingApplications',
      to: resolveEmail(firstEmployer.email),
      data: {
        employerName: firstEmployer.name,
        pendingCount: stages.filter((s) => s.stage === 'Applied').length || stages.length || 5,
        jobs: jobs.slice(0, 3).map((j) => ({
          title: j.title,
          pendingCount: Math.floor(Math.random() * 8) + 1,
        })),
        dashboardLink: `${FRONTEND_URL}/employer/applications`,
      },
    },

    // ── 7. Verification Pending ─────────────────────────────────
    {
      template: 'reminderVerificationPending',
      to: resolveEmail(admin?.email || 'admin@jobland.com'),
      data: {
        companyName: employerMap[firstEmployer._id?.toString()]?.name || 'NewTech Inc.',
        contactName: firstEmployer.name,
        email: firstEmployer.email,
        registrationDate: formatDate(firstEmployer.createdAt),
        verificationLink: `${FRONTEND_URL}/admin/employers`,
      },
    },
  ];

  // Send or render
  divider('SENDING EMAILS');
  console.log(`Mode: ${consoleMode ? 'CONSOLE (HTML logged, not sent)' : 'LIVE (emails sent via SMTP)'}`);
  console.log(`Recipient: ${EMAIL_TO}`);
  console.log(`Templates: ${emailData.length}\n`);

  let sent = 0;
  let failed = 0;

  for (const { template, to, data } of emailData) {
    const subject = getEmailSubject(template.replace('reminder', '').replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, ''), data);

    if (consoleMode) {
      // Just render and log
      const html = getEmailTemplate(template, data);
      divider(`${template}`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`--- HTML START ---`);
      console.log(html);
      console.log(`--- HTML END ---`);
      sent++;
    } else {
      // Actually send
      try {
        const result = await sendEmail(to, subject, template, data);
        if (result.success) {
          console.log(`  [OK] ${template} -> ${to}`);
          sent++;
        } else {
          console.log(`  [FAIL] ${template}: ${result.error}`);
          failed++;
        }
      } catch (err) {
        console.log(`  [ERROR] ${template}: ${err.message}`);
        failed++;
      }
    }
  }

  divider('DONE');
  console.log(`Sent: ${sent} | Failed: ${failed} | Total: ${emailData.length}`);

  if (!consoleMode) {
    console.log(`\nCheck your inbox at: ${EMAIL_TO}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
