import { connectDB } from '@/config/db';
import mongoose from 'mongoose';

const reset = async (): Promise<void> => {
  try {
    await connectDB();
    console.log('Resetting database collections...');

    const collections = mongoose.connection.collections;
    for (const key in collections) {
      console.log(`Dropping collection: ${key}`);
      await collections[key].drop().catch((err) => {
        // Suppress error if collection does not exist
        if (err.code !== 26 && err.message !== 'ns not found') {
          console.warn(`Warning dropping collection ${key}:`, err.message);
        }
      });
    }

    console.log('🎉 Database reset complete. Re-seeding plans...');
    await mongoose.disconnect();

    // Dynamically import seed script to run it
    await import('./seed');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
};

reset();
