import request from 'supertest';
import app from '@/app';
import { createTestUser, createTestPlan } from '../helpers/factories';
import { getAuthHeader } from '../helpers/auth';
import { Plan } from '@/modules/subscription/plan.model';
import { User } from '@/modules/user/user.model';
import { Message } from '@/modules/conversation/message.model';
import { UsageEvent, UsageEventType } from '@/modules/analytics/usageEvent.model';
import { GoogleProvider } from '@/modules/ai/providers/google.provider';

describe('AI Chat Route Integration Tests', () => {
  let chatSpy: jest.SpyInstance;

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
        maxMessagesPerDay: 5, // limit to 5 messages per day
        allowedModels: ['gemini-1.5-flash'],
        priorityQueue: false,
        analyticsRetentionDays: 30,
      },
    });

    // Mock GoogleProvider chat API call
    chatSpy = jest.spyOn(GoogleProvider.prototype, 'chat').mockResolvedValue({
      content: 'Hello, this is your AI response.',
      tokensUsed: 100, // gemini-1.5-flash rate is 2 credits per 1K tokens => 0.2 credits cost
      finishReason: 'stop',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should successfully complete AI chat request, deduct credits, and record UsageEvent', async () => {
    const user = await createTestUser({ credits: 10, isEmailVerified: true });
    const authHeader = getAuthHeader(user._id.toString());

    const res = await request(app).post('/api/v1/ai/chat').set(authHeader).send({
      model: 'gemini-1.5-flash',
      message: 'Hello AI!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message.content).toBe('Hello, this is your AI response.');

    // Check GoogleProvider call
    expect(chatSpy).toHaveBeenCalled();

    // Verify credits deducted
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.credits).toBe(9.8); // 10 - 0.2 = 9.8

    // Verify messages saved
    const messages = await Message.find({ conversationId: res.body.data.conversationId });
    expect(messages.length).toBe(2);

    // Verify UsageEvent logged
    const event = await UsageEvent.findOne({ userId: user._id, eventType: UsageEventType.AI_CHAT });
    expect(event).toBeTruthy();
    expect(event?.tokensUsed).toBe(100);
    expect(event?.creditsUsed).toBe(0.2);
  });

  it('should throw 422 if user has insufficient credits', async () => {
    const user = await createTestUser({ credits: 0.01, isEmailVerified: true });
    const authHeader = getAuthHeader(user._id.toString());

    const res = await request(app).post('/api/v1/ai/chat').set(authHeader).send({
      model: 'gemini-1.5-flash',
      message: 'Write a long script.',
    });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('INSUFFICIENT_CREDITS');
    expect(chatSpy).not.toHaveBeenCalled();
  });

  it('should throw 422 if requested model is not allowed in user plan', async () => {
    const user = await createTestUser({ credits: 10, isEmailVerified: true });
    const authHeader = getAuthHeader(user._id.toString());

    // gemini-1.5-pro is not in the allowedModels list of 'free' plan
    const res = await request(app).post('/api/v1/ai/chat').set(authHeader).send({
      model: 'gemini-1.5-pro',
      message: 'Write a long essay.',
    });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('MODEL_NOT_AVAILABLE');
    expect(chatSpy).not.toHaveBeenCalled();
  });

  it('should block chat if daily message limit is reached', async () => {
    const user = await createTestUser({ credits: 10, isEmailVerified: true });
    const authHeader = getAuthHeader(user._id.toString());

    // Create 5 usage events representing today's chat messages
    const today = new Date();
    const eventData = Array.from({ length: 5 }, () => ({
      userId: user._id,
      eventType: UsageEventType.AI_CHAT,
      model: 'gemini-1.5-flash',
      tokensUsed: 100,
      creditsUsed: 0.2,
      timestamp: today,
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Agent',
    }));
    await UsageEvent.create(eventData);

    const res = await request(app).post('/api/v1/ai/chat').set(authHeader).send({
      model: 'gemini-1.5-flash',
      message: 'Hello!',
    });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PLAN_LIMIT_REACHED');
    expect(chatSpy).not.toHaveBeenCalled();
  });
});
