import { Queue, ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';
import { env } from '@/config/env';

// Helper to create a dedicated Redis connection for BullMQ
export const createQueueConnection = (): Redis => {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Critical requirement for BullMQ
  });
};

// Queue instances
export const emailQueue = new Queue('email-queue', {
  connection: createQueueConnection() as unknown as ConnectionOptions,
});

export const subscriptionQueue = new Queue('subscription-queue', {
  connection: createQueueConnection() as unknown as ConnectionOptions,
});

export const apiKeyQueue = new Queue('apikey-queue', {
  connection: createQueueConnection() as unknown as ConnectionOptions,
});

export const cleanupQueue = new Queue('cleanup-queue', {
  connection: createQueueConnection() as unknown as ConnectionOptions,
});
