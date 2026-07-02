const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load the backend-specific .env (jobland-backend/.env)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not set. Check jobland-backend/.env');
    }

    const isAtlas = mongoUri.startsWith('mongodb+srv://');
    const mentionsLocalhost = mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1') || mongoUri.includes('::1');

    console.log('DB debug:', { isAtlas, mentionsLocalhost });

    mongoose.connection.on('connected', () => {
      console.log('MongoDB connection established');
    });

    mongoose.connection.on('error', (connectionError) => {
      console.error('MongoDB runtime error:', connectionError?.message || connectionError);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });
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
