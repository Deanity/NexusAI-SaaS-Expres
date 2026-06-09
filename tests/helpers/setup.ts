import mongoose from 'mongoose';
import { redis } from '@/config/redis';
import { env } from '@/config/env';
import { emailQueue, subscriptionQueue, apiKeyQueue, cleanupQueue } from '@/config/queue';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGODB_URI, { dbName: 'nexusai_test' });
  }
});

beforeEach(async () => {
  // Clear MongoDB collections
  if (mongoose.connection.readyState === 1) {
    const models = mongoose.modelNames();
    for (const modelName of models) {
      try {
        await mongoose.model(modelName).deleteMany({});
      } catch (err) {
        // Ignore
      }
    }
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      try {
        await collections[key].deleteMany({});
      } catch (err) {
        // Ignore
      }
    }
  }

  // Flush Redis database
  try {
    await redis.flushdb();
  } catch (error) {
    console.error('Failed to flush Redis:', error);
  }
});

afterAll(async () => {
  // Close BullMQ queues
  try {
    await Promise.all([
      emailQueue.close(),
      subscriptionQueue.close(),
      apiKeyQueue.close(),
      cleanupQueue.close(),
    ]);
  } catch (error) {
    // Ignore error
  }
});
