const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load the backend-specific .env (job-portal-backend/.env)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not set. Check job-portal-backend/.env');
    }

    const isAtlas = mongoUri.startsWith('mongodb+srv://');
    const mentionsLocalhost = mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1') || mongoUri.includes('::1');

    console.log('DB debug:', { isAtlas, mentionsLocalhost });

    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Mongo connection error message:', err?.message);
    console.error('Mongo connection error name:', err?.name);
    console.error('Mongo connection error code:', err?.code);
    console.error('Mongo connection error details:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
