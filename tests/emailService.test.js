const emailService = require('../utils/emailService');

describe('EmailService template rendering', () => {
  it('should render reminder templates without throwing', () => {
    const commonFooterPrefsUrl = 'http://localhost:3000/email-preferences';

    const templatesToTest = [
      ['reminderNewApplication', { employerName: 'ACME', jobTitle: 'Backend Engineer', applicantName: 'John', applicantEmail: 'john@example.com' }],
      ['reminderInterviewScheduled', { seekerName: 'Jane', companyName: 'ACME', jobTitle: 'Backend Engineer', interviewDate: '2026-01-01', interviewTime: '10:00', interviewMode: 'Google Meet', daysUntil: 2, applicationLink: 'http://localhost:3000/applications/1' }],
      ['reminderApplicationStatusUpdate', { seekerName: 'Jane', jobTitle: 'Backend Engineer', companyName: 'ACME', status: 'Approved', message: 'Nice job!', applicationLink: 'http://localhost:3000/applications/1' }],
      ['reminderJobDeadline', { seekerName: 'Jane', jobTitle: 'Backend Engineer', companyName: 'ACME', deadline: '2026-01-10', daysRemaining: 3, jobLink: 'http://localhost:3000/jobs/1' }],
      ['reminderJobExpiring', { employerName: 'ACME', jobTitle: 'Backend Engineer', expiryDate: '2026-01-15', daysRemaining: 5, renewLink: 'http://localhost:3000/employer/jobs/1' }],
      ['reminderPendingApplications', { employerName: 'ACME', pendingCount: 3, jobs: [{ title: 'Backend Engineer', pendingCount: 2 }, { title: 'Frontend Engineer', pendingCount: 1 }], dashboardLink: 'http://localhost:3000/employer/applications' }],
      ['reminderVerificationPending', { companyName: 'ACME', contactName: 'Bob', email: 'acme@example.com', registrationDate: '2026-01-01', verificationLink: 'http://localhost:3000/admin/employers/1' }],
    ];

    for (const [templateKey, data] of templatesToTest) {
      const html = emailService.getEmailTemplate(templateKey, data);
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(50);
      // Footer should contain Email Preferences link
      expect(html).toContain('Email Preferences');
      // Link can be derived from FRONTEND_URL env; we just ensure it was interpolated.
      expect(html).toContain('/email-preferences');
    }
  });
});
