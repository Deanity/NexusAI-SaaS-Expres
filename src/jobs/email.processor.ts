import { Worker, Job, ConnectionOptions } from 'bullmq';
import { createQueueConnection } from '@/config/queue';
import { env } from '@/config/env';

export interface EmailJobData {
  email: string;
  name?: string;
  token?: string;
  amount?: number;
  planName?: string;
}

export const emailWorker = new Worker(
  'email-queue',
  async (job: Job<EmailJobData>) => {
    const { name } = job;
    const { email, name: userName, token, amount, planName } = job.data;

    console.log(`[WORKER] Processing email job: ${name} (Job ID: ${job.id})`);

    switch (name) {
      case 'send-verification':
        console.log(`
┌──────────────────────────────────────────────────────────┐
│ ✉ [STUB EMAIL] EMAIL VERIFICATION                       │
├──────────────────────────────────────────────────────────┤
│ To: ${email} (Name: ${userName})
│ Link: ${env.API_BASE_URL}/api/v1/auth/verify-email?token=${token}
│ Expire: 24 Hours
└──────────────────────────────────────────────────────────┘`);
        break;

      case 'send-password-reset':
        console.log(`
┌──────────────────────────────────────────────────────────┐
│ ✉ [STUB EMAIL] PASSWORD RESET                           │
├──────────────────────────────────────────────────────────┤
│ To: ${email}
│ Link: ${env.API_BASE_URL}/api/v1/auth/reset-password?token=${token}
│ Expire: 1 Hour
└──────────────────────────────────────────────────────────┘`);
        break;

      case 'send-welcome':
        console.log(`
┌──────────────────────────────────────────────────────────┐
│ ✉ [STUB EMAIL] WELCOME BONUS                            │
├──────────────────────────────────────────────────────────┤
│ To: ${email} (Name: ${userName})
│ Message: Welcome to NexusAI!
│ You have been granted ${env.WELCOME_BONUS_CREDITS} free credits.
└──────────────────────────────────────────────────────────┘`);
        break;

      case 'send-receipt':
        console.log(`
┌──────────────────────────────────────────────────────────┐
│ ✉ [STUB EMAIL] PAYMENT RECEIPT                          │
├──────────────────────────────────────────────────────────┤
│ To: ${email}
│ Plan: ${planName}
│ Amount Paid: ${amount}
│ Status: SUCCESS
└──────────────────────────────────────────────────────────┘`);
        break;

      default:
        console.warn(`[WORKER] Unknown email job type: ${name}`);
    }
  },
  {
    connection: createQueueConnection() as unknown as ConnectionOptions,
    limiter: {
      max: 5,
      duration: 1000, // Process max 5 emails per second
    },
  }
);

emailWorker.on('failed', (job, err) => {
  console.error(`❌ [WORKER] Email job ${job?.id} failed with error:`, err);
});
