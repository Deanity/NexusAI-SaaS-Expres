import request from 'supertest';
import app from '@/app';
import { createTestUser, createTestApiKey, createTestPlan } from '../helpers/factories';
import { Plan } from '@/modules/subscription/plan.model';
import { ApiKeyScope } from '@/modules/apikey/apiKey.model';
import { GoogleProvider } from '@/modules/ai/providers/google.provider';

describe('API Key Auth Integration Tests', () => {
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

    // Mock GoogleProvider chat API call
    jest.spyOn(GoogleProvider.prototype, 'chat').mockResolvedValue({
      content: 'Mock API Key Response',
      tokensUsed: 50,
      finishReason: 'stop',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should successfully authenticate using x-api-key and process requests', async () => {
    const user = await createTestUser({ credits: 10, isEmailVerified: true });
    const { rawKey } = await createTestApiKey(user._id.toString(), {
      scopes: [ApiKeyScope.CHAT_WRITE],
    });

    const res = await request(app).post('/api/v1/ai/chat').set('x-api-key', rawKey).send({
      model: 'gemini-1.5-flash',
      message: 'Hello via API Key',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message.content).toBe('Mock API Key Response');
  });

  it('should block request with 403 if API key does not have required scope', async () => {
    const user = await createTestUser({ credits: 10, isEmailVerified: true });
    // This key has only HISTORY_READ but we need CHAT_WRITE for chat
    const { rawKey } = await createTestApiKey(user._id.toString(), {
      scopes: [ApiKeyScope.HISTORY_READ],
    });

    const res = await request(app).post('/api/v1/ai/chat').set('x-api-key', rawKey).send({
      model: 'gemini-1.5-flash',
      message: 'Hello',
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INSUFFICIENT_SCOPE');
  });

  it('should block request with 401 if API key is revoked (isActive: false)', async () => {
    const user = await createTestUser({ credits: 10, isEmailVerified: true });
    const { rawKey } = await createTestApiKey(user._id.toString(), {
      scopes: [ApiKeyScope.CHAT_WRITE],
      isActive: false,
    });

    const res = await request(app).post('/api/v1/ai/chat').set('x-api-key', rawKey).send({
      model: 'gemini-1.5-flash',
      message: 'Hello',
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('API_KEY_REVOKED');
  });

  it('should block request with 401 if API key has expired', async () => {
    const user = await createTestUser({ credits: 10, isEmailVerified: true });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { rawKey } = await createTestApiKey(user._id.toString(), {
      scopes: [ApiKeyScope.CHAT_WRITE],
      expiresAt: yesterday,
    });

    const res = await request(app).post('/api/v1/ai/chat').set('x-api-key', rawKey).send({
      model: 'gemini-1.5-flash',
      message: 'Hello',
    });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('API_KEY_EXPIRED');
  });

  it('should block request with 403 if client IP is not in whitelist', async () => {
    const user = await createTestUser({ credits: 10, isEmailVerified: true });
    const { rawKey } = await createTestApiKey(user._id.toString(), {
      scopes: [ApiKeyScope.CHAT_WRITE],
      ipWhitelist: ['8.8.8.8'], // Whitelisted IP is different
    });

    const res = await request(app).post('/api/v1/ai/chat').set('x-api-key', rawKey).send({
      model: 'gemini-1.5-flash',
      message: 'Hello',
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('API_KEY_IP_NOT_ALLOWED');
  });
});
