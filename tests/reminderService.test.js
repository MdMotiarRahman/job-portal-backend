const mongoose = require('mongoose');
const reminderService = require('../utils/reminderService');
const Reminder = require('../models/Reminder');
const User = require('../models/User');

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
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/jobportal_test');
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
});