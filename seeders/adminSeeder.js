const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../config/db');

// Admin credentials - CHANGE THESE!
const ADMIN_DATA = {
  name: 'Admin User',
  email: 'admin@jobland.com',
  password: 'AdminPassword@123',
  role: 'admin',
  phone: '+1-555-0000',
  location: 'System',
};

const seedAdmin = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('Database connected');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: ADMIN_DATA.email });

    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_DATA.password, salt);

    // Create admin user
    const admin = new User({
      name: ADMIN_DATA.name,
      email: ADMIN_DATA.email,
      password: hashedPassword,
      role: ADMIN_DATA.role,
      phone: ADMIN_DATA.phone,
      location: ADMIN_DATA.location,
      isActive: true,
      isVerified: true,
      permissions: [
        'manage_users',
        'manage_jobs',
        'manage_applications',
        'view_analytics',
        'manage_admins',
      ],
    });

    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', ADMIN_DATA.email);
    console.log('🔐 Password:', ADMIN_DATA.password);
    console.log('\n⚠️  IMPORTANT: Change the admin password after first login!');
    console.log('⚠️  Change the admin email and password in production!');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
};

// Run seeder if this file is executed directly
if (require.main === module) {
  seedAdmin();
}

module.exports = seedAdmin;
