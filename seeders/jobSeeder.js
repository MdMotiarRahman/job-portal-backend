const mongoose = require('mongoose');
const User = require('../models/User');
const Job = require('../models/Job');
const connectDB = require('../config/db');

const jobsByCompany = {
  'sarah.chen@techvista.com': [
    { title: 'Senior Full-Stack Engineer', description: 'Build and maintain scalable web applications using React, Node.js, and AWS. Collaborate with cross-functional teams to deliver enterprise SaaS features.', location: 'San Francisco, CA', jobType: 'Full-time', experienceLevel: 'Senior', skills: ['React', 'Node.js', 'AWS', 'TypeScript', 'PostgreSQL'], salary: { min: 150000, max: 190000 } },
    { title: 'Junior Frontend Developer', description: 'Join our frontend team to build responsive, accessible user interfaces for our cloud platform. Great opportunity for recent graduates.', location: 'San Francisco, CA', jobType: 'Full-time', experienceLevel: 'Entry', skills: ['React', 'CSS', 'JavaScript', 'HTML'], salary: { min: 80000, max: 100000 } },
    { title: 'DevOps Engineer', description: 'Manage CI/CD pipelines, infrastructure as code, and cloud deployments. Work closely with engineering teams to ensure reliability.', location: 'Remote', jobType: 'Full-time', experienceLevel: 'Mid', skills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins'], salary: { min: 130000, max: 160000 } },
  ],
  'james.r@greenleaf.co': [
    { title: 'Data Scientist - Environmental Analytics', description: 'Develop ML models to analyze environmental data, predict carbon emissions, and generate sustainability insights for enterprise clients.', location: 'Austin, TX', jobType: 'Full-time', experienceLevel: 'Senior', skills: ['Python', 'Machine Learning', 'Pandas', 'SQL', 'TensorFlow'], salary: { min: 140000, max: 175000 } },
    { title: 'Frontend Developer', description: 'Build interactive data visualization dashboards and user interfaces for our sustainability platform.', location: 'Austin, TX', jobType: 'Full-time', experienceLevel: 'Mid', skills: ['React', 'D3.js', 'TypeScript', 'Tailwind CSS'], salary: { min: 100000, max: 130000 } },
  ],
  'priya@nimblehealth.io': [
    { title: 'Mobile Developer - Telemedicine App', description: 'Develop and maintain our cross-platform telemedicine mobile app using React Native. Focus on video consultation features and patient UX.', location: 'Boston, MA', jobType: 'Full-time', experienceLevel: 'Mid', skills: ['React Native', 'TypeScript', 'Firebase', 'WebRTC'], salary: { min: 120000, max: 150000 } },
    { title: 'Backend Engineer - Healthcare APIs', description: 'Design and build HIPAA-compliant REST APIs for patient management, scheduling, and electronic health records integration.', location: 'Remote', jobType: 'Full-time', experienceLevel: 'Senior', skills: ['Node.js', 'PostgreSQL', 'HIPAA', 'REST API', 'Docker'], salary: { min: 135000, max: 165000 } },
    { title: 'UI/UX Design Intern', description: 'Assist our design team in creating intuitive healthcare interfaces. Learn about accessibility and user research in health tech.', location: 'Boston, MA', jobType: 'Internship', experienceLevel: 'Entry', skills: ['Figma', 'User Research', 'Wireframing', 'Prototyping'], salary: { min: 25, max: 35 } },
  ],
  'marcus@quantumfin.com': [
    { title: 'Blockchain Developer', description: 'Build decentralized financial applications and smart contracts. Work on cutting-edge blockchain infrastructure for banking.', location: 'New York, NY', jobType: 'Full-time', experienceLevel: 'Senior', skills: ['Solidity', 'Ethereum', 'Web3.js', 'Rust', 'Smart Contracts'], salary: { min: 170000, max: 220000 } },
    { title: 'Quantitative Analyst', description: 'Develop mathematical models for risk assessment, portfolio optimization, and algorithmic trading strategies.', location: 'New York, NY', jobType: 'Full-time', experienceLevel: 'Senior', skills: ['Python', 'R', 'Statistics', 'Financial Modeling', 'SQL'], salary: { min: 160000, max: 200000 } },
    { title: 'Junior Compliance Analyst', description: 'Support regulatory compliance efforts for fintech products. Review transactions and ensure adherence to financial regulations.', location: 'New York, NY', jobType: 'Full-time', experienceLevel: 'Entry', skills: ['Compliance', 'AML', 'KYC', 'Excel', 'Regulatory Reporting'], salary: { min: 70000, max: 90000 } },
    { title: 'Product Manager - Digital Payments', description: 'Lead product strategy for our digital payments platform. Define roadmap, work with engineering, and drive adoption metrics.', location: 'New York, NY', jobType: 'Full-time', experienceLevel: 'Mid', skills: ['Product Management', 'Agile', 'Fintech', 'Data Analysis'], salary: { min: 140000, max: 170000 } },
  ],
  'emily@brightpath.edu': [
    { title: 'EdTech Content Developer', description: 'Create engaging, interactive course content for our AI-powered learning platform. Collaborate with subject matter experts.', location: 'Chicago, IL', jobType: 'Full-time', experienceLevel: 'Mid', skills: ['Instructional Design', 'LMS', 'Content Creation', 'Articulate'], salary: { min: 85000, max: 110000 } },
    { title: 'Full-Stack Developer - Virtual Classroom', description: 'Build real-time virtual classroom features including video conferencing, whiteboard, and collaboration tools.', location: 'Remote', jobType: 'Full-time', experienceLevel: 'Mid', skills: ['React', 'Node.js', 'WebRTC', 'Socket.io', 'MongoDB'], salary: { min: 115000, max: 145000 } },
  ],
  'david@arcstudio.design': [
    { title: 'Senior UI/UX Designer', description: 'Lead design for enterprise clients. Create wireframes, prototypes, and high-fidelity designs for web and mobile products.', location: 'Seattle, WA', jobType: 'Full-time', experienceLevel: 'Senior', skills: ['Figma', 'Adobe XD', 'Prototyping', 'Design Systems', 'User Research'], salary: { min: 120000, max: 155000 } },
    { title: 'Brand Identity Designer', description: 'Develop brand identities including logos, typography, color palettes, and brand guidelines for startups and established companies.', location: 'Seattle, WA', jobType: 'Contract', experienceLevel: 'Mid', skills: ['Illustrator', 'Photoshop', 'Branding', 'Typography', 'Visual Design'], salary: { min: 90000, max: 120000 } },
  ],
  'olivia@swiftlogistics.com': [
    { title: 'Supply Chain Analyst', description: 'Analyze supply chain data to identify inefficiencies, optimize routing, and reduce costs across our global logistics network.', location: 'Dallas, TX', jobType: 'Full-time', experienceLevel: 'Mid', skills: ['SQL', 'Python', 'Tableau', 'Supply Chain Analytics', 'Excel'], salary: { min: 95000, max: 120000 } },
    { title: 'Warehouse Automation Engineer', description: 'Design and implement automated warehouse solutions including robotic sorting, inventory management, and IoT integration.', location: 'Dallas, TX', jobType: 'Full-time', experienceLevel: 'Senior', skills: ['PLC Programming', 'Robotics', 'IoT', 'Python', 'CAD'], salary: { min: 130000, max: 165000 } },
    { title: 'Last-Mile Delivery Coordinator', description: 'Manage last-mile delivery operations, optimize routes, and coordinate with drivers to ensure on-time deliveries.', location: 'Dallas, TX', jobType: 'Part-time', experienceLevel: 'Entry', skills: ['Logistics', 'Route Planning', 'Communication', 'Problem Solving'], salary: { min: 20, max: 28 } },
  ],
  'alex@novamedia.agency': [
    { title: 'Performance Marketing Specialist', description: 'Manage paid advertising campaigns across Google Ads, Meta, and TikTok. Optimize ROAS and drive measurable growth for clients.', location: 'Los Angeles, CA', jobType: 'Full-time', experienceLevel: 'Mid', skills: ['Google Ads', 'Meta Ads', 'Analytics', 'A/B Testing', 'PPC'], salary: { min: 85000, max: 115000 } },
    { title: 'Content Strategist', description: 'Develop and execute content strategies for brand clients. Create editorial calendars, manage writers, and measure content performance.', location: 'Remote', jobType: 'Full-time', experienceLevel: 'Mid', skills: ['Content Strategy', 'SEO', 'Copywriting', 'Social Media', 'Analytics'], salary: { min: 80000, max: 105000 } },
    { title: 'Social Media Manager', description: 'Manage organic social media presence for multiple agency clients. Create content, engage communities, and report on performance.', location: 'Los Angeles, CA', jobType: 'Full-time', experienceLevel: 'Entry', skills: ['Social Media', 'Content Creation', 'Canva', 'Scheduling Tools'], salary: { min: 55000, max: 75000 } },
  ],
};

async function run() {
  await connectDB();

  let totalCreated = 0;

  for (const [email, jobList] of Object.entries(jobsByCompany)) {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[JobSeeder] User not found: ${email}`);
      continue;
    }

    for (const jobData of jobList) {
      const existing = await Job.findOne({ title: jobData.title, company: user._id });
      if (existing) {
        console.log(`[JobSeeder] Job exists: ${jobData.title}`);
        continue;
      }

      await Job.create({
        ...jobData,
        company: user._id,
        status: 'active',
        isApproved: true,
      });
      totalCreated++;
      console.log(`[JobSeeder] Created: ${jobData.title}`);
    }
  }

  console.log(`[JobSeeder] Seeded ${totalCreated} jobs.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[JobSeeder] Error:', err);
  process.exit(1);
});
