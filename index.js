const express = require('express');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');
const configureCloudinary = require('./config/cloudinary');
const emailConfig = require('./config/email');
const { initializeReminderSchedules } = require('./utils/reminderService');

const app = express();

// Connect Database
connectDB();

const logCloudinaryStatus = () => {
  try {
    configureCloudinary();
    console.log('Cloudinary connected');
  } catch (error) {
    console.log('Cloudinary not connected:', error.message);
  }
};

logCloudinaryStatus();

// Test Email Configuration
const testEmailConfig = async () => {
  try {
    await emailConfig.testEmailConfig();
  } catch (error) {
    console.log('Email service setup skipped (optional)');
  }
};

testEmailConfig();

// Initialize Reminder Schedules (Cron jobs)
initializeReminderSchedules();

// Middleware
app.use(cors());
app.use(express.json({ extended: false }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded resume files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.send('API Running'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/employers', require('./routes/employers'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/seeker', require('./routes/seeker'));
app.use('/api/employer', require('./routes/employer'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/email-preferences', require('./routes/emailPreferences'));
app.use('/api/ats', require('./routes/ats'));
app.use('/api/interviews', require('./routes/interviews'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/search', require('./routes/search'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/recommendations', require('./routes/recommendations'));

// Multer / server error handler
app.use((err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Resume file size must be less than 5MB' });
    }
    return res.status(400).json({ message: err.message || 'Upload error' });
  }
  next();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
