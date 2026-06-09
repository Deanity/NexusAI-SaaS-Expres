import { redis } from '@/config/redis';
import { ApiKeyScope } from '@/modules/apikey/apiKey.model';
import * as apiKeyService from '@/modules/apikey/apiKey.service';
import { Plan } from '@/modules/subscription/plan.model';
import { createTestUser, createTestPlan, createTestSubscription } from '../../helpers/factories';
import { AppError } from '@/shared/errors/AppError';

describe('API Key Service Unit Tests', () => {
  beforeEach(async () => {
    // Seed default "free" plan as fallback
    await Plan.deleteMany({});
    await createTestPlan({
      name: 'Free Plan',
      slug: 'free',
      isActive: true,
      features: {
        maxApiKeys: 1,
        maxConversations: -1,
        maxMessagesPerDay: 5,
        allowedModels: ['gemini-1.5-flash'],
        priorityQueue: false,
        analyticsRetentionDays: 30,
      },
    });
  });

  it('should generate a valid API key string prefixed with nxai_', () => {
    const key = apiKeyService.generateApiKeyString();
    expect(key.startsWith('nxai_')).toBe(true);
    expect(key.length).toBe(45);
  });

  it('should successfully create an API key for a user on Free plan', async () => {
    const user = await createTestUser();
    const { rawKey, keyDoc } = await apiKeyService.createKey(user._id.toString(), 'My Pro Key', [
      ApiKeyScope.CHAT_WRITE,
    ]);

    expect(rawKey).toBeTruthy();
    expect(keyDoc.name).toBe('My Pro Key');
    expect(keyDoc.keyPrefix).toBe(rawKey.substring(0, 8));
    expect(keyDoc.scopes).toContain(ApiKeyScope.CHAT_WRITE);
    expect(keyDoc.isActive).toBe(true);
  });

  it('should enforce API key limits based on plan', async () => {
    const user = await createTestUser();
    // Free plan allows max 1 API key
    await apiKeyService.createKey(user._id.toString(), 'Key 1', [ApiKeyScope.CHAT_WRITE]);

    await expect(
      apiKeyService.createKey(user._id.toString(), 'Key 2', [ApiKeyScope.CHAT_WRITE])
    ).rejects.toThrow(AppError);
  });

  it('should allow more keys if user upgrades to a plan with higher limits', async () => {
    const user = await createTestUser();
    const plan = await createTestPlan({ features: { maxApiKeys: 3 } as any });
    await createTestSubscription(user._id.toString(), plan._id.toString());

    // Pro plan allows max 3 API keys
    await apiKeyService.createKey(user._id.toString(), 'Key 1', [ApiKeyScope.CHAT_WRITE]);
    await apiKeyService.createKey(user._id.toString(), 'Key 2', [ApiKeyScope.CHAT_WRITE]);
    const { keyDoc } = await apiKeyService.createKey(user._id.toString(), 'Key 3', [
      ApiKeyScope.CHAT_WRITE,
    ]);

    expect(keyDoc).toBeTruthy();
    await expect(
      apiKeyService.createKey(user._id.toString(), 'Key 4', [ApiKeyScope.CHAT_WRITE])
    ).rejects.toThrow(AppError);
  });

  it('should list all keys for a user', async () => {
    const user = await createTestUser();
    const plan = await createTestPlan({ features: { maxApiKeys: 5 } as any });
    await createTestSubscription(user._id.toString(), plan._id.toString());

    await apiKeyService.createKey(user._id.toString(), 'Key 1', [ApiKeyScope.CHAT_WRITE]);
    await apiKeyService.createKey(user._id.toString(), 'Key 2', [ApiKeyScope.CHAT_WRITE]);

    const keys = await apiKeyService.listKeys(user._id.toString());
    expect(keys.length).toBe(2);
  });

  it('should update key name and scopes, and invalidate cache', async () => {
    const user = await createTestUser();
    const { keyDoc } = await apiKeyService.createKey(user._id.toString(), 'Old Name', [
      ApiKeyScope.CHAT_WRITE,
    ]);

    // Mock set a cache
    const cacheKey = `apikey:${keyDoc.keyHash}`;
    await redis.set(cacheKey, 'some_cached_data');

    const updated = await apiKeyService.updateKey(user._id.toString(), keyDoc._id.toString(), {
      name: 'New Name',
      scopes: [ApiKeyScope.HISTORY_READ],
    });

    expect(updated.name).toBe('New Name');
    expect(updated.scopes).toContain(ApiKeyScope.HISTORY_READ);
    expect(updated.scopes).not.toContain(ApiKeyScope.CHAT_WRITE);

    // Verify cache is deleted
    const cached = await redis.get(cacheKey);
    expect(cached).toBeNull();
  });

  it('should revoke a key and invalidate cache', async () => {
    const user = await createTestUser();
    const { keyDoc } = await apiKeyService.createKey(user._id.toString(), 'Key to revoke', [
      ApiKeyScope.CHAT_WRITE,
    ]);

    const cacheKey = `apikey:${keyDoc.keyHash}`;
    await redis.set(cacheKey, 'some_cached_data');

    const revoked = await apiKeyService.revokeKey(user._id.toString(), keyDoc._id.toString());
    expect(revoked.isActive).toBe(false);

    const cached = await redis.get(cacheKey);
    expect(cached).toBeNull();
  });

  it('should rotate a key, generate new prefix/hash, and invalidate old cache', async () => {
    const user = await createTestUser();
    const { keyDoc } = await apiKeyService.createKey(user._id.toString(), 'Key to rotate', [
      ApiKeyScope.CHAT_WRITE,
    ]);

    const cacheKey = `apikey:${keyDoc.keyHash}`;
    await redis.set(cacheKey, 'some_cached_data');

    const { rawKey, keyDoc: rotated } = await apiKeyService.rotateKey(
      user._id.toString(),
      keyDoc._id.toString()
    );
    expect(rawKey).toBeTruthy();
    expect(rotated.keyPrefix).toBe(rawKey.substring(0, 8));
    expect(rotated.keyHash).not.toBe(keyDoc.keyHash);

    const cached = await redis.get(cacheKey);
    expect(cached).toBeNull();
  });
});
