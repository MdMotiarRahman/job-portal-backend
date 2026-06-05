const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('express')();

// Minimal app wiring for admin routes so tests can run without starting the full server
const authenticate = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');
const adminRouter = require('../routes/admin');

app.use('/api/admin', authenticate, requireRole('admin'), adminRouter);

// Fallback route to satisfy supertest when DB isn't available
app.get('/health', (req, res) => res.json({ ok: true }));
const User = require('../models/User');
const SeekerProfile = require('../models/SeekerProfile');
const EmployerProfile = require('../models/EmployerProfile');

const makeTokenForUser = (user) => {
  return jwt.sign(
    { user: { id: user._id, role: user.role }, role: user.role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

describe('Admin User Management', () => {
  let admin;
  let seeker;
  let employer;
  let adminToken;

  beforeAll(async () => {
    // Ensure mongoose is connected for CRUD tests
    if (mongoose.connection.readyState === 0) {
      const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/jobportal_test';
      await mongoose.connect(uri);
    }


    admin = await User.create({
      name: 'Admin',
      email: `admin-${Date.now()}@test.com`,
      password: 'x'.repeat(60),
      role: 'admin',
      isActive: true,
      isVerified: true,
      isBanned: false,
    });

    // NOTE: password hashing is bypassed for tests that do not call login.
    adminToken = makeTokenForUser(admin);

    seeker = await User.create({
      name: 'Seeker',
      email: `seeker-${Date.now()}@test.com`,
      password: 'x'.repeat(60),
      role: 'seeker',
      isActive: true,
      isVerified: true,
      isBanned: false,
    });
    await SeekerProfile.create({ user: seeker._id, fullName: seeker.name });

    employer = await User.create({
      name: 'Employer',
      email: `employer-${Date.now()}@test.com`,
      password: 'x'.repeat(60),
      role: 'employer',
      isActive: true,
      isVerified: true,
      isBanned: false,
    });
    await EmployerProfile.create({ user: employer._id, companyName: employer.name });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await SeekerProfile.deleteMany({});
    await EmployerProfile.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/admin/users', () => {
    it('returns users (admin only)', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.users).toBeDefined();
      expect(Array.isArray(res.body.users)).toBe(true);
    });
  });

  describe('PUT /api/admin/users/:id/ban', () => {
    it('bans user with reason', async () => {
      const reason = 'Violation';
      const res = await request(app)
        .put(`/api/admin/users/${seeker._id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.isBanned).toBe(true);
      expect(res.body.user.bannedReason).toBe(reason);

      const refreshed = await User.findById(seeker._id);
      expect(refreshed.isBanned).toBe(true);
    });
  });

  describe('PUT /api/admin/users/:id/unban', () => {
    it('unbans user', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${seeker._id}/unban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.user.isBanned).toBe(false);
    });
  });

  describe('PUT /api/admin/users/:id/verify', () => {
    it('verifies user', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${employer._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.user.isVerified).toBe(true);
    });
  });
});

