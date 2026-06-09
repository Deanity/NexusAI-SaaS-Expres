import mongoose from 'mongoose';
import crypto from 'crypto';
import { redis } from '@/config/redis';
import { env } from '@/config/env';
import { emailWorker } from '@/jobs/email.processor';
import { subscriptionWorker } from '@/jobs/subscription.processor';
import { apiKeyWorker } from '@/jobs/apikey.processor';
import { cleanupWorker } from '@/jobs/cleanup.processor';
import { emailQueue, subscriptionQueue, apiKeyQueue, cleanupQueue } from '@/config/queue';

beforeAll(async () => {
  // Ensure we connect to MongoDB if not connected
  if (mongoose.connection.readyState === 0) {
    const testPath = expect.getState().testPath || 'default';
    const hash = crypto.createHash('md5').update(testPath).digest('hex');
    const dbName = `nx_${hash}`;
    await mongoose.connect(env.MONGODB_URI, { dbName });
  }
});

beforeEach(async () => {
  // Clear MongoDB collections
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
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
  // Close BullMQ workers
  try {
    await Promise.all([
      emailWorker.close(),
      subscriptionWorker.close(),
      apiKeyWorker.close(),
      cleanupWorker.close(),
    ]);
  } catch (error) {
    // Ignore error
  }

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

  // Close database connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  // Close Redis client connection
  try {
    await redis.quit();
  } catch (error) {
    // Ignore error
  }
});
