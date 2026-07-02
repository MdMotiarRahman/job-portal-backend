const mongoose = require('mongoose');
const reminderService = require('../utils/reminderService');
const Reminder = require('../models/Reminder');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');

// Mock dependencies
jest.mock('../utils/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-id' })
}));

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue(true)
}));

describe('ReminderService Tests', () => {
  beforeAll(async () => {
    // Setup test database connection
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/jobland_test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Reminder.deleteMany({});
    await User.deleteMany({});
    jest.clearAllMocks();
  });

  describe('createReminder', () => {
    it('should create a new reminder successfully', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'seeker'
      });

      const reminderData = {
        user: user._id,
        type: 'interview_scheduled',
        title: 'Test Reminder',
        description: 'Test Description',
        dueDate: new Date(),
        templateData: { tags: ['urgent'] }
      };

      const reminder = await reminderService.createReminder(reminderData);

      expect(reminder).toBeDefined();
      expect(reminder.title).toBe('Test Reminder');
      expect(reminder.user.toString()).toBe(user._id.toString());
      expect(reminder.templateData.tags).toContain('urgent');
    });
  });

  describe('markAsViewed', () => {
    it('should mark a reminder as viewed', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'seeker'
      });

      let reminder = await Reminder.create({
        user: user._id,
        type: 'interview_scheduled',
        title: 'Test Reminder',
        dueDate: new Date(),
        status: 'pending'
      });

      reminder = await reminderService.markAsViewed(reminder._id);

      expect(reminder.status).toBe('viewed');
      expect(reminder.viewedAt).toBeDefined();
    });
  });

  describe('sendPendingReminders (template mapping + email sending)', () => {
    beforeEach(async () => {
      await Reminder.deleteMany({});
      await User.deleteMany({});
      jest.clearAllMocks();
    });

    it('should send email with correct template key for interview_scheduled', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'seeker'
      });

      await Reminder.create({
        user: user._id,
        type: 'interview_scheduled',
        title: '🎉 Interview Scheduled!',
        description: 'Interview description',
        dueDate: new Date(Date.now() - 60 * 1000),
        status: 'pending',
        emailSent: false,
        isActive: true,
        templateData: {
          seekerName: user.name,
          jobTitle: 'Engineer',
          companyName: 'ACME',
          interviewDate: new Date().toLocaleDateString(),
          interviewTime: '10:00',
          interviewMode: 'Google Meet',
          daysUntil: 2,
          applicationLink: 'http://localhost:3000/applications/1',
        },
      });

      await reminderService.sendPendingReminders();

      // reminder.type: interview_scheduled => reminderInterviewScheduled
      expect(sendEmail).toHaveBeenCalledTimes(1);
      const [, , templateKey] = sendEmail.mock.calls[0];
      expect(templateKey).toBe('reminderInterviewScheduled');
    });

    it('should send email with correct template key for new_application', async () => {
      const user = await User.create({
        name: 'Employer User',
        email: 'employer@example.com',
        password: 'password123',
        role: 'employer'
      });

      await Reminder.create({
        user: user._id,
        type: 'new_application',
        title: '📧 New Application Received',
        description: 'New application description',
        dueDate: new Date(Date.now() - 60 * 1000),
        status: 'pending',
        emailSent: false,
        isActive: true,
        templateData: {
          employerName: user.name,
          jobTitle: 'Backend Engineer',
          applicantName: 'John Doe',
          applicantEmail: 'john@example.com',
          applicationLink: 'http://localhost:3000/employer/applications/1',
          tags: ['action-required'],
          urgencyLevel: 'high',
        },
      });

      await reminderService.sendPendingReminders();

      // reminder.type: new_application => reminderNewApplication
      expect(sendEmail).toHaveBeenCalledTimes(1);
      const [, , templateKey] = sendEmail.mock.calls[0];
      expect(templateKey).toBe('reminderNewApplication');
    });
  });
});
