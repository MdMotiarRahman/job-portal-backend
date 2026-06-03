/**
 * Email Service
 * Handles sending emails for reminders and notifications
 * Supports multiple templates
 */

const emailConfig = require('../config/email');

/**
 * Send Email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} template - Email template name
 * @param {object} data - Template data
 */
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
      console.log('\n📧 EMAIL LOG (Console Mode):');
      console.log('─'.repeat(50));
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Template: ${template}`);
      console.log('─'.repeat(50));
      console.log(htmlContent);
      console.log('─'.repeat(50) + '\n');
    } else {
      console.log(`✅ Email sent via ${emailConfig.provider}: ${info.messageId}`);
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email sending failed (${template}):`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Email Templates
 */
const getEmailTemplate = (template, data) => {
  const templates = {
    reminderNewApplication: reminderNewApplicationTemplate(data),
    reminderInterviewScheduled: reminderInterviewScheduledTemplate(data),
    reminderApplicationStatusUpdate: reminderApplicationStatusUpdateTemplate(data),
    reminderJobDeadline: reminderJobDeadlineTemplate(data),
    reminderJobExpiring: reminderJobExpiringTemplate(data),
    reminderPendingApplications: reminderPendingApplicationsTemplate(data),
    reminderVerificationPending: reminderVerificationPendingTemplate(data),
  };

  return templates[template] || defaultTemplate(data);
};

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Template: New Job Application
 * For: Employers
 */
const reminderNewApplicationTemplate = (data) => `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
      .content { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
      .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
      .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
      .badge { display: inline-block; background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📧 New Application Received</h1>
      </div>
      
      <div class="content">
        <p>Hi <strong>${data.employerName}</strong>,</p>
        
        <p>Great news! You have a new application for your job posting.</p>
        
        <h3>📋 Application Details:</h3>
        <ul>
          <li><strong>Job Title:</strong> ${data.jobTitle}</li>
          <li><strong>Applicant:</strong> ${data.applicantName}</li>
          <li><strong>Email:</strong> ${data.applicantEmail}</li>
          <li><strong>Applied On:</strong> ${new Date().toLocaleDateString()}</li>
        </ul>
        
        <p>
          <a href="${data.applicationLink}" class="button">View Application</a>
        </p>
        
        <p><strong>Pro tip:</strong> Review applications promptly to attract top talent!</p>
      </div>
      
      <div class="footer">
        <p>Job Portal - Your Professional Recruitment Platform</p>
        <p>© 2026 Job Portal. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>
`;

/**
 * Template: Interview Scheduled
 * For: Seekers
 */
const reminderInterviewScheduledTemplate = (data) => `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
      .content { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
      .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px; }
      .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
      .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎉 Interview Scheduled!</h1>
      </div>
      
      <div class="content">
        <p>Hi <strong>${data.seekerName}</strong>,</p>
        
        <p>Congratulations! ${data.companyName} has scheduled an interview with you!</p>
        
        <h3>📅 Interview Details:</h3>
        <ul>
          <li><strong>Position:</strong> ${data.jobTitle}</li>
          <li><strong>Date:</strong> ${data.interviewDate}</li>
          <li><strong>Time:</strong> ${data.interviewTime}</li>
          <li><strong>Mode:</strong> ${data.interviewMode}</li>
        </ul>
        
        <div class="alert">
          <strong>⏰ Reminder:</strong> Your interview is in ${data.daysUntil} day(s). Please review the job description and prepare accordingly.
        </div>
        
        <p>
          <a href="${data.applicationLink}" class="button">View Full Details</a>
        </p>
      </div>
      
      <div class="footer">
        <p>Job Portal - Your Professional Recruitment Platform</p>
      </div>
    </div>
  </body>
</html>
`;

/**
 * Template: Application Status Update
 * For: Seekers
 */
const reminderApplicationStatusUpdateTemplate = (data) => `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
      .content { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
      .status { font-size: 18px; font-weight: bold; padding: 10px; text-align: center; border-radius: 6px; margin: 15px 0; }
      .status-approved { background: #d1fae5; color: #065f46; }
      .status-rejected { background: #fee2e2; color: #991b1b; }
      .status-pending { background: #fef3c7; color: #92400e; }
      .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📬 Application Status Update</h1>
      </div>
      
      <div class="content">
        <p>Hi <strong>${data.seekerName}</strong>,</p>
        
        <p>Your application for <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong> has been updated.</p>
        
        <div class="status status-${data.statusClass}">
          Status: ${data.status.toUpperCase()}
        </div>
        
        ${data.message ? `<p><strong>Message from Employer:</strong></p><p>${data.message}</p>` : ''}
        
        <p>Thank you for your interest!</p>
      </div>
      
      <div class="footer">
        <p>Job Portal - Your Professional Recruitment Platform</p>
      </div>
    </div>
  </body>
</html>
`;

/**
 * Template: Job Deadline Approaching
 * For: Seekers
 */
const reminderJobDeadlineTemplate = (data) => `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #ef4444 0%, #f59e0b 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
      .content { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
      .alert { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; border-radius: 4px; }
      .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
      .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>⏰ Application Deadline Approaching</h1>
      </div>
      
      <div class="content">
        <p>Hi <strong>${data.seekerName}</strong>,</p>
        
        <p>The application deadline for a job you've already applied to is closing soon!</p>
        
        <div class="alert">
          <strong>⚠️ Only ${data.daysRemaining} day(s) remaining to apply for similar positions!</strong>
        </div>
        
        <h3>Job Details:</h3>
        <ul>
          <li><strong>Position:</strong> ${data.jobTitle}</li>
          <li><strong>Company:</strong> ${data.companyName}</li>
          <li><strong>Deadline:</strong> ${data.deadline}</li>
        </ul>
        
        <p>
          <a href="${data.jobLink}" class="button">View & Apply</a>
        </p>
      </div>
      
      <div class="footer">
        <p>Job Portal - Your Professional Recruitment Platform</p>
      </div>
    </div>
  </body>
</html>
`;

/**
 * Template: Job Expiring Soon
 * For: Employers
 */
const reminderJobExpiringTemplate = (data) => `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
      .content { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
      .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
      .stat-card { background: white; padding: 15px; border-radius: 6px; text-align: center; }
      .stat-number { font-size: 24px; font-weight: bold; color: #6366f1; }
      .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
      .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📢 Job Posting Expiring Soon</h1>
      </div>
      
      <div class="content">
        <p>Hi <strong>${data.employerName}</strong>,</p>
        
        <p>Your job posting will expire in <strong>${data.daysRemaining} day(s)</strong>.</p>
        
        <h3>Job Details:</h3>
        <ul>
          <li><strong>Position:</strong> ${data.jobTitle}</li>
          <li><strong>Expiry Date:</strong> ${data.expiryDate}</li>
        </ul>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-number">${data.totalApplications}</div>
            <div>Total Applications</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">${data.pendingApplications}</div>
            <div>Pending Review</div>
          </div>
        </div>
        
        <p>Renew your posting to continue receiving applications from qualified candidates.</p>
        
        <p>
          <a href="${data.renewLink}" class="button">Renew Posting</a>
        </p>
      </div>
      
      <div class="footer">
        <p>Job Portal - Your Professional Recruitment Platform</p>
      </div>
    </div>
  </body>
</html>
`;

/**
 * Template: Pending Applications Reminder
 * For: Employers
 */
const reminderPendingApplicationsTemplate = (data) => `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
      .content { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
      .alert { background: #dbeafe; border-left: 4px solid #06b6d4; padding: 15px; margin: 15px 0; border-radius: 4px; }
      .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
      .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📋 Pending Applications Waiting for Review</h1>
      </div>
      
      <div class="content">
        <p>Hi <strong>${data.employerName}</strong>,</p>
        
        <div class="alert">
          <strong>ℹ️ You have <strong>${data.pendingCount}</strong> applications waiting for review!</strong>
        </div>
        
        <p>Don't miss out on great candidates. Review and respond to applications promptly.</p>
        
        <h3>Pending Jobs:</h3>
        <ul>
          ${data.jobs.map(job => `<li><strong>${job.title}</strong> - ${job.pendingCount} pending</li>`).join('')}
        </ul>
        
        <p>
          <a href="${data.dashboardLink}" class="button">Review Applications</a>
        </p>
      </div>
      
      <div class="footer">
        <p>Job Portal - Your Professional Recruitment Platform</p>
      </div>
    </div>
  </body>
</html>
`;

/**
 * Template: Employer Verification Pending
 * For: Admin
 */
const reminderVerificationPendingTemplate = (data) => `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
      .content { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
      .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px; }
      .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
      .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>👤 Employer Verification Pending</h1>
      </div>
      
      <div class="content">
        <p>Hi Admin,</p>
        
        <div class="alert">
          <strong>⚠️ New employer verification pending review!</strong>
        </div>
        
        <h3>Employer Details:</h3>
        <ul>
          <li><strong>Company:</strong> ${data.companyName}</li>
          <li><strong>Contact Person:</strong> ${data.contactName}</li>
          <li><strong>Email:</strong> ${data.email}</li>
          <li><strong>Registration Date:</strong> ${data.registrationDate}</li>
        </ul>
        
        <p>Review and approve/reject this employer to proceed.</p>
        
        <p>
          <a href="${data.verificationLink}" class="button">Review Employer</a>
        </p>
      </div>
      
      <div class="footer">
        <p>Job Portal - Admin Notification System</p>
      </div>
    </div>
  </body>
</html>
`;

/**
 * Default Template
 */
const defaultTemplate = (data) => `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px; }
      .content { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Job Portal Notification</h1>
      </div>
      <div class="content">
        <p>${data.message || 'You have a new notification from Job Portal.'}</p>
      </div>
    </div>
  </body>
</html>
`;

module.exports = {
  sendEmail,
};
