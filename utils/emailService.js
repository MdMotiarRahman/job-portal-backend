/**
 * Email Service
 * Handles sending emails for reminders and notifications
 */

const emailConfig = require('../config/email');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PREFERENCES_URL = `${FRONTEND_URL}/email-preferences`;

// ─── Subject Lines ────────────────────────────────────────────────

const EMAIL_SUBJECTS = {
  'new-application': ({ jobTitle }) => `New Application: ${jobTitle}`,
  'interview': ({ jobTitle }) => `Interview Scheduled: ${jobTitle}`,
  'application-status': ({ status }) => `Application Status Update: ${status}`,
  'job-deadline': ({ jobTitle }) => `Deadline Approaching: ${jobTitle}`,
  'job-expiring': ({ jobTitle }) => `Job Posting Expiring: ${jobTitle}`,
  'verification-pending': ({ companyName }) => `Verification Pending: ${companyName}`,
};

const getEmailSubject = (reminderType, data) => {
  const subjectFn = EMAIL_SUBJECTS[reminderType];
  return subjectFn ? subjectFn(data) : 'JobPortal Notification';
};

// ─── Send Email ───────────────────────────────────────────────────

const sendEmail = async (to, subject, template, data = {}) => {
  try {
    const htmlContent = getEmailTemplate(template, data);

    const mailOptions = {
      from: emailConfig.emailFrom,
      to,
      subject,
      html: htmlContent,
    };

    const info = await emailConfig.transporter.sendMail(mailOptions);

    if (emailConfig.provider === 'console') {
      console.log('\nEMAIL LOG (Console Mode):');
      console.log('-'.repeat(50));
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Template: ${template}`);
      console.log('-'.repeat(50));
      console.log(htmlContent);
      console.log('-'.repeat(50) + '\n');
    } else {
      console.log(`Email sent via ${emailConfig.provider}: ${info.messageId}`);
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Email sending failed (${template}):`, error.message);
    return { success: false, error: error.message };
  }
};

// ─── Shared Layout ────────────────────────────────────────────────

const emailHeader = (brandColor = '#1a1a2e') => `
<table width="100%" cellpadding="0" cellspacing="0" style="background:${brandColor};">
  <tr>
    <td style="padding:16px 24px;">
      <span style="font-size:16px;font-weight:700;color:#fff;letter-spacing:-0.3px;">JobPortal</span>
    </td>
  </tr>
</table>
`;

const emailFooter = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;border-top:1px solid #eee;">
  <tr>
    <td style="padding:16px 24px;font-size:11px;color:#999;line-height:1.5;">
      <p style="margin:0 0 4px 0;">This is a notification from JobPortal.</p>
      <p style="margin:0;">
        <a href="${PREFERENCES_URL}" style="color:#999;text-decoration:underline;">Manage email preferences</a>
      </p>
    </td>
  </tr>
</table>
`;

const button = (url, label, color = '#1a1a2e') => `
<a href="${url}" style="display:inline-block;background:${color};color:#fff;font-size:13px;font-weight:600;padding:10px 20px;border-radius:4px;text-decoration:none;margin-top:16px;">${label}</a>
`;

const infoBox = (content, accent = '#e8e8e8') => `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-left:3px solid ${accent};background:#fafafa;">
  <tr>
    <td style="padding:12px 16px;font-size:13px;color:#333;line-height:1.6;">
      ${content}
    </td>
  </tr>
</table>
`;

const row = (label, value) => `
<tr>
  <td style="padding:3px 0;font-size:13px;color:#888;white-space:nowrap;">${label}</td>
  <td style="padding:3px 0 3px 12px;font-size:13px;color:#333;font-weight:500;">${value}</td>
</tr>
`;

const wrap = (body) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:6px;overflow:hidden;">
          ${emailHeader()}
          <tr>
            <td style="padding:24px;">
              ${body}
            </td>
          </tr>
          ${emailFooter}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─── Template: New Application ────────────────────────────────────

const reminderNewApplicationTemplate = (data) => wrap(`
  <h2 style="margin:0 0 16px;font-size:17px;font-weight:600;color:#1a1a2e;">New Application Received</h2>
  <p style="margin:0 0 12px;font-size:14px;color:#555;line-height:1.6;">
    ${data.employerName}, you have a new application for <strong>${data.jobTitle}</strong>.
  </p>
  ${infoBox(`
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Applicant', data.applicantName)}
      ${row('Email', data.applicantEmail)}
      ${row('Position', data.jobTitle)}
    </table>
  `, '#1a1a2e')}
  ${button(data.applicationLink || FRONTEND_URL + '/employer/applications', 'View Application')}
`);

// ─── Template: Interview Scheduled ────────────────────────────────

const reminderInterviewScheduledTemplate = (data) => wrap(`
  <h2 style="margin:0 0 16px;font-size:17px;font-weight:600;color:#1a1a2e;">Interview Scheduled</h2>
  <p style="margin:0 0 12px;font-size:14px;color:#555;line-height:1.6;">
    Hi ${data.seekerName}, ${data.companyName} has scheduled an interview with you.
  </p>
  ${infoBox(`
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Position', data.jobTitle)}
      ${row('Date', data.interviewDate)}
      ${row('Time', data.interviewTime)}
      ${row('Mode', data.interviewMode)}
    </table>
  `, '#1a1a2e')}
  ${data.daysUntil ? infoBox(`Your interview is in <strong>${data.daysUntil} day${data.daysUntil > 1 ? 's' : ''}</strong>. Please review the job description and prepare accordingly.`, '#f59e0b') : ''}
  ${button(data.applicationLink || FRONTEND_URL + '/seeker/applications', 'View Details')}
`);

// ─── Template: Application Status Update ──────────────────────────

const reminderApplicationStatusUpdateTemplate = (data) => wrap(`
  <h2 style="margin:0 0 16px;font-size:17px;font-weight:600;color:#1a1a2e;">Application Status Update</h2>
  <p style="margin:0 0 12px;font-size:14px;color:#555;line-height:1.6;">
    Hi ${data.seekerName}, your application for <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong> has been updated.
  </p>
  ${infoBox(`<strong>Status:</strong> ${(data.status || '').toUpperCase()}`, '#1a1a2e')}
  ${data.message ? `<p style="margin:12px 0 0;font-size:13px;color:#555;line-height:1.5;"><strong>Message from Employer:</strong><br>${data.message}</p>` : ''}
`);

// ─── Template: Job Deadline Approaching ───────────────────────────

const reminderJobDeadlineTemplate = (data) => wrap(`
  <h2 style="margin:0 0 16px;font-size:17px;font-weight:600;color:#1a1a2e;">Deadline Approaching</h2>
  <p style="margin:0 0 12px;font-size:14px;color:#555;line-height:1.6;">
    Hi ${data.seekerName}, a job you may be interested in has an approaching deadline.
  </p>
  ${infoBox(`<strong>Only ${data.daysRemaining} day${data.daysRemaining > 1 ? 's' : ''} remaining to apply.</strong>`, '#ef4444')}
  ${infoBox(`
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Position', data.jobTitle)}
      ${row('Company', data.companyName)}
      ${row('Deadline', data.deadline)}
    </table>
  `, '#1a1a2e')}
  ${button(data.jobLink || FRONTEND_URL + '/jobs', 'View & Apply')}
`);

// ─── Template: Job Expiring ───────────────────────────────────────

const reminderJobExpiringTemplate = (data) => wrap(`
  <h2 style="margin:0 0 16px;font-size:17px;font-weight:600;color:#1a1a2e;">Job Posting Expiring</h2>
  <p style="margin:0 0 12px;font-size:14px;color:#555;line-height:1.6;">
    Hi ${data.employerName}, your job posting will expire in <strong>${data.daysRemaining} day${data.daysRemaining > 1 ? 's' : ''}</strong>.
  </p>
  ${infoBox(`
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Position', data.jobTitle)}
      ${row('Expiry Date', data.expiryDate)}
    </table>
  `, '#1a1a2e')}
  <p style="margin:12px 0 0;font-size:13px;color:#555;line-height:1.5;">
    Renew your posting to continue receiving applications.
  </p>
  ${button(data.renewLink || FRONTEND_URL + '/employer/jobs', 'Renew Posting')}
`);

// ─── Template: Pending Applications ───────────────────────────────

const reminderPendingApplicationsTemplate = (data) => {
  const jobRows = (data.jobs || []).map(j =>
    `<tr>
      <td style="padding:6px 0;font-size:13px;color:#333;">${j.title}</td>
      <td style="padding:6px 0;font-size:13px;color:#888;text-align:right;">${j.pendingCount} pending</td>
    </tr>`
  ).join('');

  return wrap(`
    <h2 style="margin:0 0 16px;font-size:17px;font-weight:600;color:#1a1a2e;">Pending Applications</h2>
    <p style="margin:0 0 12px;font-size:14px;color:#555;line-height:1.6;">
      Hi ${data.employerName}, you have <strong>${data.pendingCount}</strong> applications waiting for review.
    </p>
    ${jobRows ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;">
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px 0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">Job</td>
        <td style="padding:8px 0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Pending</td>
      </tr>
      ${jobRows}
    </table>` : ''}
    ${button(data.dashboardLink || FRONTEND_URL + '/employer/applications', 'Review Applications')}
  `);
};

// ─── Template: Verification Pending ───────────────────────────────

const reminderVerificationPendingTemplate = (data) => wrap(`
  <h2 style="margin:0 0 16px;font-size:17px;font-weight:600;color:#1a1a2e;">Employer Verification Pending</h2>
  <p style="margin:0 0 12px;font-size:14px;color:#555;line-height:1.6;">
    A new employer registration requires verification.
  </p>
  ${infoBox(`
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Company', data.companyName)}
      ${row('Contact', data.contactName)}
      ${row('Email', data.email)}
      ${row('Registered', data.registrationDate)}
    </table>
  `, '#f59e0b')}
  ${button(data.verificationLink || FRONTEND_URL + '/admin/employers', 'Review Employer')}
`);

// ─── Default Template ─────────────────────────────────────────────

const defaultTemplate = (data) => wrap(`
  <h2 style="margin:0 0 16px;font-size:17px;font-weight:600;color:#1a1a2e;">Notification</h2>
  <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
    ${data.message || 'You have a new notification from JobPortal.'}
  </p>
`);

// ─── Template Router ──────────────────────────────────────────────

const getEmailTemplate = (template, data) => {
  const templates = {
    reminderNewApplication: reminderNewApplicationTemplate,
    reminderInterviewScheduled: reminderInterviewScheduledTemplate,
    reminderApplicationStatusUpdate: reminderApplicationStatusUpdateTemplate,
    reminderJobDeadline: reminderJobDeadlineTemplate,
    reminderJobExpiring: reminderJobExpiringTemplate,
    reminderPendingApplications: reminderPendingApplicationsTemplate,
    reminderVerificationPending: reminderVerificationPendingTemplate,
  };

  const fn = templates[template] || defaultTemplate;
  return fn(data);
};

module.exports = {
  sendEmail,
  getEmailSubject,
  getEmailTemplate,
};
