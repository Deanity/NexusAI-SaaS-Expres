import { Worker, Job, ConnectionOptions } from 'bullmq';
import { createQueueConnection, subscriptionQueue } from '@/config/queue';
import { Subscription, SubscriptionStatus } from '@/modules/subscription/subscription.model';
import { Plan } from '@/modules/subscription/plan.model';
import { addCredits } from '@/modules/credit/credit.service';
import { CreditAction } from '@/modules/credit/creditLedger.model';

export interface SubscriptionJobData {
  subscriptionId?: string;
  userId?: string;
}

export const subscriptionWorker = new Worker(
  'subscription-queue',
  async (job: Job<SubscriptionJobData>) => {
    const { name } = job;

    console.log(`[WORKER] Processing subscription job: ${name} (Job ID: ${job.id})`);

    if (name === 'daily-renewal-check') {
      const now = new Date();
      const expiringSubs = await Subscription.find({
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        currentPeriodEnd: { $lte: now },
      });

      console.log(`[WORKER] Found ${expiringSubs.length} expiring subscriptions to renew.`);

      for (const sub of expiringSubs) {
        await subscriptionQueue.add('process-renewal', {
          subscriptionId: sub._id.toString(),
          userId: sub.userId.toString(),
        });
      }
    } else if (name === 'process-renewal') {
      const { subscriptionId, userId } = job.data;
      if (!subscriptionId || !userId) {
        throw new Error('Missing subscriptionId or userId for process-renewal job');
      }

      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        throw new Error(`Subscription not found: ${subscriptionId}`);
      }

      if (
        subscription.status !== SubscriptionStatus.ACTIVE &&
        subscription.status !== SubscriptionStatus.TRIALING
      ) {
        console.log(
          `[WORKER] Subscription ${subscriptionId} status is ${subscription.status}, skipping renewal.`
        );
        return;
      }

      const plan = await Plan.findById(subscription.planId);
      if (!plan || !plan.isActive) {
        throw new Error(
          `Plan associated with subscription ${subscriptionId} is invalid or inactive`
        );
      }

      // Calculate next period dates (30 days from previous end date)
      const prevEnd = subscription.currentPeriodEnd;
      const currentPeriodStart = new Date(prevEnd);
      const currentPeriodEnd = new Date(prevEnd.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Update subscription period
      subscription.currentPeriodStart = currentPeriodStart;
      subscription.currentPeriodEnd = currentPeriodEnd;
      await subscription.save();

      // Grant credits for the new cycle
      await addCredits(
        userId,
        plan.creditsPerCycle,
        CreditAction.SUBSCRIPTION,
        subscriptionId,
        'Subscription',
        `Credits grant for subscription renewal: ${plan.name}`
      );

      console.log(
        `✔ [WORKER] Subscription ${subscriptionId} renewed successfully. New period end: ${currentPeriodEnd.toISOString()}`
      );
    } else {
      console.warn(`[WORKER] Unknown subscription job type: ${name}`);
    }
  },
  {
    connection: createQueueConnection() as unknown as ConnectionOptions,
  }
);

subscriptionWorker.on('failed', (job, err) => {
  console.error(`❌ [WORKER] Subscription job ${job?.id} failed with error:`, err);
});
