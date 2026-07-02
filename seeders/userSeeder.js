const bcrypt = require('bcryptjs');
const User = require('../models/User');
const connectDB = require('../config/db');

const roles = [
  { role: 'admin', name: 'Admin User', email: 'admin@jobland.local', password: 'Admin@12345' },
  { role: 'employer', name: 'Employer User', email: 'employer@jobland.local', password: 'Employer@12345' },
  { role: 'seeker', name: 'Seeker User', email: 'seeker@jobland.local', password: 'Seeker@12345' },
];

async function run() {
  await connectDB();

  const saltRounds = 10;

  for (const r of roles) {
    // Check if user exists
    const existing = await User.findOne({ email: r.email });

    const passwordHash = await bcrypt.hash(r.password, saltRounds);

    if (existing) {
      existing.name = r.name;
      existing.role = r.role;
      existing.password = passwordHash;
      await existing.save();
      console.log(`[Seeder] Updated ${r.role}: ${r.email}`);
    } else {
      await User.create({
        name: r.name,
        email: r.email,
        password: passwordHash,
        role: r.role,
      });
      console.log(`[Seeder] Created ${r.role}: ${r.email}`);
    }
  }

  console.log('[Seeder] Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error('[Seeder] Error:', err);
  process.exit(1);
});
