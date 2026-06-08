import { emailWorker } from './email.processor';
import { subscriptionWorker } from './subscription.processor';
import { apiKeyWorker } from './apikey.processor';
import { cleanupWorker } from './cleanup.processor';
import { subscriptionQueue, cleanupQueue } from '@/config/queue';

export const initWorkers = (): void => {
  console.log('✔ Initializing background workers...');

  // Reference workers to prevent tree-shaking
  const workers = [emailWorker, subscriptionWorker, apiKeyWorker, cleanupWorker];

  console.log(`✔ Loaded ${workers.length} background workers successfully.`);
};

export const setupSchedulers = async (): Promise<void> => {
  console.log('✔ Setting up background schedulers (repeatable jobs)...');

  try {
    // 1. Subscription Renewal Check: Daily at 00:05 UTC
    await subscriptionQueue.add(
      'daily-renewal-check',
      {},
      {
        repeat: {
          pattern: '5 0 * * *', // Minute 5, Hour 0 (00:05 every day)
        },
        jobId: 'sub_renewal_repeatable',
      }
    );

    // 2. Token Cleanup: Daily at 02:00 UTC
    await cleanupQueue.add(
      'cleanup-expired-tokens',
      {},
      {
        repeat: {
          pattern: '0 2 * * *', // Minute 0, Hour 2 (02:00 every day)
        },
        jobId: 'token_cleanup_repeatable',
      }
    );

    // 3. Analytics Cleanup Rollup: Daily at 01:00 UTC
    await cleanupQueue.add(
      'analytics-daily-rollup',
      {},
      {
        repeat: {
          pattern: '0 1 * * *', // Minute 0, Hour 1 (01:00 every day)
        },
        jobId: 'analytics_cleanup_repeatable',
      }
    );

    console.log('✔ Background schedulers configured successfully.');
  } catch (error) {
    console.error('❌ Failed to configure background schedulers:', error);
  }
};
