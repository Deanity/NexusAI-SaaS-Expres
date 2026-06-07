import Redis from 'ioredis';
import { env } from '@/config/env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Recommended for BullMQ
  reconnectOnError: (err: Error): boolean => {
    const targetError = 'READONLY';
    if (err.message.slice(0, targetError.length) === targetError) {
      return true; // Reconnect on readonly errors
    }
    return false;
  },
});

redis.on('connect', () => {
  console.log('Connecting to Redis...');
});

redis.on('ready', () => {
  console.log('✔ Connected to Redis successfully and ready.');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('close', () => {
  console.warn('Redis connection closed.');
});

export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const response = await redis.ping();
    return response === 'PONG';
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
    return false;
  }
};
