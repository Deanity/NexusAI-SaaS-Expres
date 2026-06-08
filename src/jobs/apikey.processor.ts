import { Worker, Job, ConnectionOptions } from 'bullmq';
import { createQueueConnection } from '@/config/queue';
import { ApiKey } from '@/modules/apikey/apiKey.model';
import { redis } from '@/config/redis';

export interface ApiKeyJobData {
  apiKeyId: string;
}

export const apiKeyWorker = new Worker(
  'apikey-queue',
  async (job: Job<ApiKeyJobData>) => {
    const { apiKeyId } = job.data;

    const apiKey = await ApiKey.findById(apiKeyId);
    if (!apiKey) {
      console.warn(`[WORKER] ApiKey not found: ${apiKeyId}`);
      return;
    }

    // Increment usage count and update last used date
    apiKey.usageCount += 1;
    apiKey.lastUsedAt = new Date();
    await apiKey.save();

    // Invalidate Redis cache to ensure the updated doc is fetched next time
    const cacheKey = `apikey:${apiKey.keyHash}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      parsed.usageCount = apiKey.usageCount;
      parsed.lastUsedAt = apiKey.lastUsedAt.toISOString();
      await redis.set(cacheKey, JSON.stringify(parsed), 'EX', 300); // Keep cache updated
    }

    console.log(`✔ [WORKER] ApiKey ${apiKeyId} stats updated. usageCount: ${apiKey.usageCount}`);
  },
  {
    connection: createQueueConnection() as unknown as ConnectionOptions,
  }
);

apiKeyWorker.on('failed', (job, err) => {
  console.error(`❌ [WORKER] ApiKey job ${job?.id} failed with error:`, err);
});
