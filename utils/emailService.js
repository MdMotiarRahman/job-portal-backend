/**
 * Email Service
 * Handles sending emails for reminders and notifications
 * Supports multiple templates
 */

const emailConfig = require('../config/email');

const EMAIL_SUBJECTS = {
  'new-application': ({ jobTitle }) => `📝 New Application: ${jobTitle}`,
  'interview': ({ jobTitle }) => `📅 [ACTION REQUIRED] Interview Scheduled: ${jobTitle}`,
  'application-status': ({ status }) => `✅ Application Status Update: ${status}`,
  'job-deadline': ({ jobTitle }) => `⏰ Application Deadline Approaching: ${jobTitle}`,
  'job-expiring': ({ jobTitle }) => `⚠️ [URGENT] Your Job Posting Expires Soon: ${jobTitle}`,
  'verification-pending': ({ companyName }) => `🔍 [REVIEW NEEDED] Employer Verification: ${companyName}`,
};

const getEmailSubject = (reminderType, data) => {
  const subjectFn = EMAIL_SUBJECTS[reminderType];
  return subjectFn ? subjectFn(data) : 'JobPortal Reminder';
};

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

const getEmailHeader = (brandColor = '#667eea') => `
  <div style="background: linear-gradient(135deg, ${brandColor} 0%, #764ba2 100%); 
              padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">JobPortal</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Stay Updated on Your Opportunities</p>
  </div>
`;

const getEmailFooter = (preferencesUrl) => `
  <div style="background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e8e8e8; margin-top: 20px;">
    <p style="margin: 0 0 8px 0;">© 2026 JobPortal. All rights reserved.</p>
    <p style="margin: 8px 0;">
      <a href="${preferencesUrl}" style="color: #667eea; text-decoration: none;">Email Preferences</a> | 
      <a href="https://jobportal.com/help" style="color: #667eea; text-decoration: none;">Help Center</a>
    </p>
  </div>
`;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const preferencesUrl = `${FRONTEND_URL}/email-preferences`;

/**
 * Template: New Job Application
 * For: Employers
 */
const reminderNewApplicationTemplate = (data) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background: white;">
      \${getEmailHeader()}
      
      <div style="padding: 24px;">
        <h2 style="color: #333; margin-top: 0;">📝 New Application Received</h2>
        
        <p style="color: #666; line-height: 1.6;">
          Hi <strong>\${data.employerName}</strong>,
        </p>
        <p style="color: #666; line-height: 1.6;">
          You have a new application for <strong>\${data.jobTitle}</strong> from <strong>\${data.applicantName}</strong>.
        </p>
        
        <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; color: #333;"><strong>Applicant Name:</strong> \${data.applicantName}</p>
          <p style="margin: 8px 0 0 0; color: #333;"><strong>Email:</strong> \${data.applicantEmail}</p>
          <p style="margin: 8px 0 0 0; color: #333;"><strong>Job:</strong> \${data.jobTitle}</p>
          <p style="margin: 8px 0 0 0; color: #666; font-size: 12px;">Applied: \${new Date().toLocaleDateString()}</p>
        </div>
        
        <a href="\${data.applicationLink || FRONTEND_URL + '/employer/applications'}" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; 
                   font-weight: 600; margin: 16px 0;">
          View Application →
        </a>
      </div>
      
      \${getEmailFooter(preferencesUrl)}
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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background: white;">
      \${getEmailHeader()}
      
      <div style="padding: 24px;">
        <h2 style="color: #333; margin-top: 0;">🎉 Interview Scheduled!</h2>
        
        <p style="color: #666; line-height: 1.6;">
          Hi <strong>\${data.seekerName}</strong>,
        </p>
        <p style="color: #666; line-height: 1.6;">
          Congratulations! \${data.companyName} has scheduled an interview with you!
        </p>
        
        <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; color: #333;"><strong>Position:</strong> \${data.jobTitle}</p>
          <p style="margin: 8px 0 0 0; color: #333;"><strong>Date:</strong> \${data.interviewDate}</p>
          <p style="margin: 8px 0 0 0; color: #333;"><strong>Time:</strong> \${data.interviewTime}</p>
          <p style="margin: 8px 0 0 0; color: #333;"><strong>Mode:</strong> \${data.interviewMode}</p>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <strong>⏰ Reminder:</strong> Your interview is in \${data.daysUntil} day(s). Please review the job description and prepare accordingly.
        </div>
        
        <a href="\${data.applicationLink || FRONTEND_URL + '/seeker/applications'}" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; 
                   font-weight: 600; margin: 16px 0;">
          View Full Details →
        </a>
      </div>
      
      \${getEmailFooter(preferencesUrl)}
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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background: white;">
      \${getEmailHeader()}
      
      <div style="padding: 24px;">
        <h2 style="color: #333; margin-top: 0;">📬 Application Status Update</h2>
        
        <p style="color: #666; line-height: 1.6;">
          Hi <strong>\${data.seekerName}</strong>,
        </p>
        <p style="color: #666; line-height: 1.6;">
          Your application for <strong>\${data.jobTitle}</strong> at <strong>\${data.companyName}</strong> has been updated.
        </p>
        
        <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; color: #333; font-weight: bold;">Status: \${(data.status || '').toUpperCase()}</p>
        </div>
        
        \${data.message ? \`<p style="color: #666;"><strong>Message from Employer:</strong><br/>\${data.message}</p>\` : ''}
      </div>
      
      \${getEmailFooter(preferencesUrl)}
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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background: white;">
      \${getEmailHeader('#ef4444')}
      
      <div style="padding: 24px;">
        <h2 style="color: #333; margin-top: 0;">⏰ Application Deadline Approaching</h2>
        
        <p style="color: #666; line-height: 1.6;">
          Hi <strong>\${data.seekerName}</strong>,
        </p>
        <p style="color: #666; line-height: 1.6;">
          The application deadline for a job you might be interested in is closing soon!
        </p>
        
        <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <strong>⚠️ Only \${data.daysRemaining} day(s) remaining to apply!</strong>
        </div>
        
        <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; color: #333;"><strong>Position:</strong> \${data.jobTitle}</p>
          <p style="margin: 8px 0 0 0; color: #333;"><strong>Company:</strong> \${data.companyName}</p>
          <p style="margin: 8px 0 0 0; color: #333;"><strong>Deadline:</strong> \${data.deadline}</p>
        </div>
        
        <a href="\${data.jobLink || FRONTEND_URL + '/jobs'}" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; 
                   font-weight: 600; margin: 16px 0;">
          View & Apply →
        </a>
      </div>
      
      \${getEmailFooter(preferencesUrl)}
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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background: white;">
      \${getEmailHeader('#f59e0b')}
      
      <div style="padding: 24px;">
        <h2 style="color: #333; margin-top: 0;">📢 Job Posting Expiring Soon</h2>
        
        <p style="color: #666; line-height: 1.6;">
          Hi <strong>\${data.employerName}</strong>,
        </p>
        <p style="color: #666; line-height: 1.6;">
          Your job posting will expire in <strong>\${data.daysRemaining} day(s)</strong>.
        </p>
        
        <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; color: #333;"><strong>Position:</strong> \${data.jobTitle}</p>
          <p style="margin: 8px 0 0 0; color: #333;"><strong>Expiry Date:</strong> \${data.expiryDate}</p>
        </div>
        
        <p style="color: #666; line-height: 1.6;">
          Renew your posting to continue receiving applications from qualified candidates.
        </p>
        
        <a href="\${data.renewLink || FRONTEND_URL + '/employer/jobs'}" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; 
                   font-weight: 600; margin: 16px 0;">
          Renew Posting →
        </a>
      </div>
      
      \${getEmailFooter(preferencesUrl)}
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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background: white;">
      \${getEmailHeader()}
      
      <div style="padding: 24px;">
        <h2 style="color: #333; margin-top: 0;">📋 Pending Applications Waiting for Review</h2>
        
        <p style="color: #666; line-height: 1.6;">
          Hi <strong>\${data.employerName}</strong>,
        </p>
        
        <div style="background: #dbeafe; border-left: 4px solid #06b6d4; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <strong>ℹ️ You have \${data.pendingCount} applications waiting for review!</strong>
        </div>
        
        <p style="color: #666; line-height: 1.6;">
          Don't miss out on great candidates. Review and respond to applications promptly.
        </p>
        
        <ul style="color: #666;">
          \${(data.jobs || []).map(job => \`<li><strong>\${job.title}</strong> - \${job.pendingCount} pending</li>\`).join('')}
        </ul>
        
        <a href="\${data.dashboardLink || FRONTEND_URL + '/employer/applications'}" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; 
                   font-weight: 600; margin: 16px 0;">
          Review Applications →
        </a>
      </div>
      
      \${getEmailFooter(preferencesUrl)}
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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background: white;">
      \${getEmailHeader('#8b5cf6')}
      
      <div style="padding: 24px;">
        <h2 style="color: #333; margin-top: 0;">👤 Employer Verification Pending</h2>
        
        <p style="color: #666; line-height: 1.6;">
          Hi Admin,
        </p>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <strong>⚠️ New employer verification pending review!</strong>
        </div>
        
        <div style="background: #f0f4ff; border-left: 4px solid #667eea; padding: 12px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; color: #333;"><strong>Company:</strong> \${data.companyName}</p>
          <p style="margin: 8px 0 0 0; color: #333;"><strong>Contact Person:</strong> \${data.contactName}</p>
          <p style="margin: 8px 0 0 0; color: #333;"><strong>Email:</strong> \${data.email}</p>
          <p style="margin: 8px 0 0 0; color: #333;"><strong>Registration Date:</strong> \${data.registrationDate}</p>
        </div>
        
        <a href="\${data.verificationLink || FRONTEND_URL + '/admin/employers'}" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; 
                   font-weight: 600; margin: 16px 0;">
          Review Employer →
        </a>
      </div>
      
      \${getEmailFooter(preferencesUrl)}
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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; background: white;">
      \${getEmailHeader()}
      
      <div style="padding: 24px;">
        <h2 style="color: #333; margin-top: 0;">Job Portal Notification</h2>
        <p style="color: #666; line-height: 1.6;">
          \${data.message || 'You have a new notification from Job Portal.'}
        </p>
      </div>
      
      \${getEmailFooter(preferencesUrl)}
    </div>
  </body>
  </html>
`;

module.exports = {
  sendEmail,
  getEmailSubject,
};