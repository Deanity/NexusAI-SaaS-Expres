import { Worker, Job, ConnectionOptions } from 'bullmq';
import { createQueueConnection } from '@/config/queue';
import { EmailVerification } from '@/modules/auth/emailVerification.model';
import { UsageEvent } from '@/modules/analytics/usageEvent.model';
import { Plan } from '@/modules/subscription/plan.model';
import { Subscription } from '@/modules/subscription/subscription.model';

export let cleanupWorker: Worker | null = null;

if (process.env.NODE_ENV !== 'test') {
  cleanupWorker = new Worker(
    'cleanup-queue',
    async (job: Job) => {
      const { name } = job;

      console.log(`[WORKER] Processing cleanup job: ${name} (Job ID: ${job.id})`);

      if (name === 'cleanup-expired-tokens') {
        const now = new Date();
        // Remove used or expired email verification & password reset tokens
        const result = await EmailVerification.deleteMany({
          $or: [{ expiresAt: { $lt: now } }, { usedAt: { $ne: null } }],
        });

        console.log(
          `✔ [WORKER] Cleaned up ${result.deletedCount} expired or used verification tokens.`
        );
      } else if (name === 'analytics-daily-rollup') {
        console.log('[WORKER] Running daily analytics cleanup rollup...');

        const plans = await Plan.find();
        for (const plan of plans) {
          const retentionDays = plan.features.analyticsRetentionDays;
          const cutOffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

          // Find subscriptions associated with this plan
          const subscriptions = await Subscription.find({ planId: plan._id });
          const userIds = subscriptions.map((sub) => sub.userId);

          if (userIds.length > 0) {
            const result = await UsageEvent.deleteMany({
              userId: { $in: userIds },
              timestamp: { $lt: cutOffDate },
            });

            console.log(
              `✔ [WORKER] Deleted ${result.deletedCount} UsageEvents older than ${retentionDays} days for plan '${plan.name}'`
            );
          }
        }

        // Fallback: Delete any events older than 180 days (max retention) for robustness
        const maxCutOffDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
        const fallbackResult = await UsageEvent.deleteMany({
          timestamp: { $lt: maxCutOffDate },
        });

        if (fallbackResult.deletedCount > 0) {
          console.log(
            `✔ [WORKER] Fallback cleanup deleted ${fallbackResult.deletedCount} ancient UsageEvents.`
          );
        }

        console.log('✔ [WORKER] Daily analytics rollup cleanup completed.');
      } else {
        console.warn(`[WORKER] Unknown cleanup job type: ${name}`);
      }
    },
    {
      connection: createQueueConnection() as unknown as ConnectionOptions,
    }
  );

  cleanupWorker.on('failed', (job, err) => {
    console.error(`❌ [WORKER] Cleanup job ${job?.id} failed with error:`, err);
  });
}
