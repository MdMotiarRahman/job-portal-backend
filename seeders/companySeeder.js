const bcrypt = require('bcryptjs');
const User = require('../models/User');
const EmployerProfile = require('../models/EmployerProfile');
const connectDB = require('../config/db');

const companies = [
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@techvista.com',
    password: 'Company@12345',
    profile: {
      companyName: 'TechVista Solutions',
      industry: 'Technology',
      companyDescription: 'TechVista Solutions is a leading software development company specializing in cloud architecture, AI-driven products, and enterprise SaaS platforms. We partner with Fortune 500 companies to deliver scalable, modern technology solutions.',
      companyWebsite: 'https://techvista.com',
      companySize: '201-500',
      location: 'San Francisco, CA',
      phone: '+1-415-555-0101',
      verificationStatus: 'approved',
      isVerified: true,
    },
  },
  {
    name: 'James Rodriguez',
    email: 'james.r@greenleaf.co',
    password: 'Company@12345',
    profile: {
      companyName: 'GreenLeaf Analytics',
      industry: 'Environmental Services',
      companyDescription: 'GreenLeaf Analytics provides sustainability intelligence and environmental data analytics to help organizations measure, reduce, and report their carbon footprint. Our platform is trusted by 200+ enterprises globally.',
      companyWebsite: 'https://greenleaf.co',
      companySize: '51-200',
      location: 'Austin, TX',
      phone: '+1-512-555-0202',
      verificationStatus: 'approved',
      isVerified: true,
    },
  },
  {
    name: 'Priya Sharma',
    email: 'priya@nimblehealth.io',
    password: 'Company@12345',
    profile: {
      companyName: 'Nimble Health',
      industry: 'Healthcare',
      companyDescription: 'Nimble Health is a digital health startup building accessible telemedicine and patient management tools. Our mission is to make quality healthcare available to everyone, everywhere.',
      companyWebsite: 'https://nimblehealth.io',
      companySize: '51-200',
      location: 'Boston, MA',
      phone: '+1-617-555-0303',
      verificationStatus: 'approved',
      isVerified: true,
    },
  },
  {
    name: 'Marcus Thompson',
    email: 'marcus@quantumfin.com',
    password: 'Company@12345',
    profile: {
      companyName: 'Quantum Finance',
      industry: 'Financial Services',
      companyDescription: 'Quantum Finance offers next-generation fintech solutions including digital payments, wealth management, and blockchain-based banking infrastructure. We serve over 500 financial institutions worldwide.',
      companyWebsite: 'https://quantumfin.com',
      companySize: '501-1000',
      location: 'New York, NY',
      phone: '+1-212-555-0404',
      verificationStatus: 'approved',
      isVerified: true,
    },
  },
  {
    name: 'Emily Watson',
    email: 'emily@brightpath.edu',
    password: 'Company@12345',
    profile: {
      companyName: 'BrightPath Education',
      industry: 'Education',
      companyDescription: 'BrightPath Education transforms learning through AI-powered adaptive courses, virtual classrooms, and professional development programs. We operate in 30+ countries and serve millions of learners.',
      companyWebsite: 'https://brightpath.edu',
      companySize: '201-500',
      location: 'Chicago, IL',
      phone: '+1-312-555-0505',
      verificationStatus: 'approved',
      isVerified: true,
    },
  },
  {
    name: 'David Kim',
    email: 'david@arcstudio.design',
    password: 'Company@12345',
    profile: {
      companyName: 'Arc Studio Design',
      industry: 'Design & Creative',
      companyDescription: 'Arc Studio Design is a creative agency offering UI/UX design, brand identity, and product design consulting. We craft beautiful, user-centered digital experiences for startups and enterprises.',
      companyWebsite: 'https://arcstudio.design',
      companySize: '1-50',
      location: 'Seattle, WA',
      phone: '+1-206-555-0606',
      verificationStatus: 'approved',
      isVerified: true,
    },
  },
  {
    name: 'Olivia Martinez',
    email: 'olivia@swiftlogistics.com',
    password: 'Company@12345',
    profile: {
      companyName: 'Swift Logistics',
      industry: 'Logistics & Supply Chain',
      companyDescription: 'Swift Logistics provides end-to-end supply chain management, last-mile delivery, and warehouse automation solutions. Our AI-driven platform optimizes routing and inventory across 15 countries.',
      companyWebsite: 'https://swiftlogistics.com',
      companySize: '1000+',
      location: 'Dallas, TX',
      phone: '+1-214-555-0707',
      verificationStatus: 'approved',
      isVerified: true,
    },
  },
  {
    name: 'Alexander Petrov',
    email: 'alex@novamedia.agency',
    password: 'Company@12345',
    profile: {
      companyName: 'Nova Media Agency',
      industry: 'Marketing & Advertising',
      companyDescription: 'Nova Media Agency is a full-service digital marketing firm specializing in performance marketing, content strategy, and social media management. We help brands grow through data-driven campaigns.',
      companyWebsite: 'https://novamedia.agency',
      companySize: '51-200',
      location: 'Los Angeles, CA',
      phone: '+1-310-555-0808',
      verificationStatus: 'approved',
      isVerified: true,
    },
  },
];

async function run() {
  await connectDB();

  const saltRounds = 10;

  for (const c of companies) {
    const passwordHash = await bcrypt.hash(c.password, saltRounds);

    let user = await User.findOne({ email: c.email });

    if (user) {
      user.name = c.name;
      user.password = passwordHash;
      user.role = 'employer';
      user.isActive = true;
      await user.save();
      console.log(`[Seeder] Updated user: ${c.email}`);
    } else {
      user = await User.create({
        name: c.name,
        email: c.email,
        password: passwordHash,
        role: 'employer',
        isActive: true,
      });
      console.log(`[Seeder] Created user: ${c.email}`);
    }

    let profile = await EmployerProfile.findOne({ user: user._id });

    if (profile) {
      Object.assign(profile, c.profile);
      await profile.save();
      console.log(`[Seeder] Updated profile: ${c.profile.companyName}`);
    } else {
      await EmployerProfile.create({
        user: user._id,
        ...c.profile,
      });
      console.log(`[Seeder] Created profile: ${c.profile.companyName}`);
    }
  }

  console.log(`[Seeder] Seeded ${companies.length} companies.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[Seeder] Error:', err);
  process.exit(1);
});
