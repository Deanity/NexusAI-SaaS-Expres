import mongoose from 'mongoose';
import { env } from '@/config/env';

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 5000;

export const connectDB = async (): Promise<void> => {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      attempts++;
      console.log(`Connecting to MongoDB Atlas (Attempt ${attempts}/${MAX_RETRIES})...`);
      await mongoose.connect(env.MONGODB_URI);
      console.log('✔ Connected to MongoDB Atlas successfully.');
      return;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${attempts} failed:`, error);
      if (attempts < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_INTERVAL_MS / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
      }
    }
  }

  console.error('❌ Could not connect to MongoDB Atlas after maximum retries. Exiting.');
  process.exit(1);
};
