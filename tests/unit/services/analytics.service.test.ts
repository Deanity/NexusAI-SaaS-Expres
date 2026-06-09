import mongoose from 'mongoose';
import { UsageEvent, UsageEventType } from '@/modules/analytics/usageEvent.model';
import { Message } from '@/modules/conversation/message.model';
import * as analyticsService from '@/modules/analytics/analytics.service';
import { createTestUser, createTestApiKey } from '../../helpers/factories';

describe('Analytics Service Unit Tests', () => {
  it('should successfully get overview analytics with details and latency', async () => {
    const user = await createTestUser();
    const userId = user._id.toString();

    const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create mock UsageEvent
    await UsageEvent.create({
      userId: user._id,
      eventType: UsageEventType.AI_CHAT,
      model: 'gemini-1.5-flash',
      tokensUsed: 120,
      creditsUsed: 0.24,
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test',
      timestamp: new Date(),
    });

    // Create mock Message with latency
    await Message.create({
      conversationId: new mongoose.Types.ObjectId(),
      userId: user._id,
      role: 'assistant',
      content: 'AI Response',
      model: 'gemini-1.5-flash',
      tokensUsed: 100,
      creditsDeducted: 0.2,
      latencyMs: 350,
    });

    const result = await analyticsService.getOverview(userId, from, to);
    expect(result.totalMessages).toBe(1);
    expect(result.totalTokensUsed).toBe(120);
    expect(result.totalCreditsUsed).toBe(0.24);
    expect(result.averageLatencyMs).toBe(350);
    expect(result.mostUsedModel).toBe('gemini-1.5-flash');
  });

  it('should successfully get daily breakdown statistics', async () => {
    const user = await createTestUser();
    const userId = user._id.toString();

    const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await UsageEvent.create({
      userId: user._id,
      eventType: UsageEventType.AI_CHAT,
      model: 'gemini-1.5-flash',
      tokensUsed: 100,
      creditsUsed: 0.2,
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test',
      timestamp: new Date(),
    });

    const breakdown = await analyticsService.getDailyBreakdown(userId, from, to);
    expect(breakdown.length).toBe(1);
    expect(breakdown[0].creditsUsed).toBe(0.2);
    expect(breakdown[0].messagesCount).toBe(1);
  });

  it('should successfully get model breakdown statistics', async () => {
    const user = await createTestUser();
    const userId = user._id.toString();

    const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await UsageEvent.create([
      {
        userId: user._id,
        eventType: UsageEventType.AI_CHAT,
        model: 'gemini-1.5-flash',
        tokensUsed: 100,
        creditsUsed: 0.2,
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
        timestamp: new Date(),
      },
      {
        userId: user._id,
        eventType: UsageEventType.AI_CHAT,
        model: 'gemini-1.5-pro',
        tokensUsed: 200,
        creditsUsed: 1.0,
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
        timestamp: new Date(),
      },
    ]);

    const breakdown = await analyticsService.getModelBreakdown(userId, from, to);
    expect(breakdown.length).toBe(2);
    expect(breakdown[0].model).toBe('gemini-1.5-pro'); // Sorted by creditsUsed desc
    expect(breakdown[1].model).toBe('gemini-1.5-flash');
  });

  it('should successfully get api-key usage breakdown', async () => {
    const user = await createTestUser();
    const userId = user._id.toString();
    const { keyDoc } = await createTestApiKey(userId);

    const from = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await UsageEvent.create({
      userId: user._id,
      eventType: UsageEventType.API_CALL,
      model: 'gemini-1.5-flash',
      tokensUsed: 100,
      creditsUsed: 0.2,
      apiKeyId: keyDoc._id,
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test',
      timestamp: new Date(),
    });

    const breakdown = await analyticsService.getApiKeyBreakdown(userId, from, to);
    expect(breakdown.length).toBe(1);
    expect(breakdown[0].apiKeyId.toString()).toBe(keyDoc._id.toString());
    expect(breakdown[0].keyName).toBe(keyDoc.name);
    expect(breakdown[0].apiCallsCount).toBe(1);
  });
});
