import * as aiService from '@/modules/ai/ai.service';
import { GoogleProvider } from '@/modules/ai/providers/google.provider';
import { createTestUser } from '../../helpers/factories';
import { User } from '@/modules/user/user.model';
import { Message } from '@/modules/conversation/message.model';
import { UsageEvent, UsageEventType } from '@/modules/analytics/usageEvent.model';
import { AppError } from '@/shared/errors/AppError';
import mongoose from 'mongoose';
import { redis } from '@/config/redis';

describe('AI Service Unit Tests', () => {
  let chatSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock the GoogleProvider chat methods to prevent actual API calls
    chatSpy = jest.spyOn(GoogleProvider.prototype, 'chat').mockResolvedValue({
      content: 'Hello, this is a mock response.',
      tokensUsed: 150,
      finishReason: 'stop',
    });

    jest.spyOn(GoogleProvider.prototype, 'chatStream').mockResolvedValue({
      content: 'Hello, this is a mock streamed response.',
      tokensUsed: 200,
      finishReason: 'stop',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should correctly calculate credit rates for different models', () => {
    expect(aiService.getModelRate('gemini-1.5-pro')).toBe(5);
    expect(aiService.getModelRate('gemini-1.5-flash')).toBe(2);
    expect(aiService.getModelRate('gpt-4o')).toBe(10);
  });

  it('should correctly estimate prompt tokens based on string length', () => {
    const text = 'Hello world';
    expect(aiService.estimatePromptTokens(text)).toBe(Math.ceil(text.length / 4));
  });

  it('should correctly calculate credit cost based on model and token count', () => {
    expect(aiService.calculateCreditCost('gemini-1.5-pro', 2000)).toBe(10); // (2000 / 1000) * 5
    expect(aiService.calculateCreditCost('gemini-1.5-flash', 1000)).toBe(2); // (1000 / 1000) * 2
  });

  it('should successfully process AI chat, deduct credits, and record UsageEvent', async () => {
    const user = await createTestUser({ credits: 100 });

    const options = {
      model: 'gemini-1.5-flash',
      message: 'Hello!',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Agent',
    };

    const result = await aiService.handleChat(user._id.toString(), options);

    expect(result).toBeTruthy();
    expect(result.conversationId).toBeTruthy();
    expect(result.message.content).toBe('Hello, this is a mock response.');

    // Check GoogleProvider call
    expect(chatSpy).toHaveBeenCalled();

    // Verify credits deducted
    const updatedUser = await User.findById(user._id);
    // 150 tokens * 2 rate / 1000 = 0.3 credits
    expect(updatedUser?.credits).toBe(99.7);

    // Verify messages saved
    const messages = await Message.find({ conversationId: result.conversationId });
    expect(messages.length).toBe(2); // user message + assistant response

    // Verify UsageEvent saved
    const event = await UsageEvent.findOne({ userId: user._id, eventType: UsageEventType.AI_CHAT });
    expect(event).toBeTruthy();
    expect(event?.tokensUsed).toBe(150);
    expect(event?.creditsUsed).toBe(0.3);
  });

  it('should throw an error if user has insufficient credits', async () => {
    const user = await createTestUser({ credits: 0.01 });

    const options = {
      model: 'gemini-1.5-pro',
      message: 'Write a long essay.',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Agent',
    };

    await expect(aiService.handleChat(user._id.toString(), options)).rejects.toThrow(AppError);
    expect(chatSpy).not.toHaveBeenCalled();
  });

  it('should cover all model rates including future models and fallback', () => {
    expect(aiService.getModelRate('gpt-4o-mini')).toBe(2);
    expect(aiService.getModelRate('claude-3-5-sonnet')).toBe(8);
    expect(aiService.getModelRate('claude-3-haiku')).toBe(1);
    expect(aiService.getModelRate('nonexistent-model')).toBe(2);
  });

  it('should throw 404 if conversationId is provided but conversation does not exist', async () => {
    const user = await createTestUser({ credits: 100 });
    const fakeConvId = new mongoose.Types.ObjectId().toString();
    const options = {
      conversationId: fakeConvId,
      model: 'gemini-1.5-flash',
      message: 'Hello!',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Agent',
    };

    await expect(aiService.handleChat(user._id.toString(), options)).rejects.toThrow(
      expect.objectContaining({
        statusCode: 404,
        code: 'NOT_FOUND',
      })
    );
  });

  it('should fetch recent messages context when sending message to existing conversation', async () => {
    const user = await createTestUser({ credits: 100 });
    const options = {
      model: 'gemini-1.5-flash',
      message: 'First Message',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Agent',
    };

    const firstResult = await aiService.handleChat(user._id.toString(), options);
    
    const secondResult = await aiService.handleChat(user._id.toString(), {
      conversationId: firstResult.conversationId,
      model: 'gemini-1.5-flash',
      message: 'Second Message',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Agent',
    });

    expect(secondResult.conversationId).toBe(firstResult.conversationId);
  });

  it('should support streaming chat and trigger onChunk callback', async () => {
    const user = await createTestUser({ credits: 100 });
    const chunks: string[] = [];
    const onChunk = (chunk: string) => {
      chunks.push(chunk);
    };

    const options = {
      model: 'gemini-1.5-flash',
      message: 'Hello!',
      stream: true,
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Agent',
    };

    const result = await aiService.handleChat(user._id.toString(), options, onChunk);
    expect(result).toBeTruthy();
    expect(chunks.length).toBeGreaterThan(0);
    // First chunk contains conversationId
    expect(chunks[0]).toContain('conversationId');
  });

  it('should delete analytics cache in Redis if cache keys exist', async () => {
    const user = await createTestUser({ credits: 100 });
    const cacheKey = `analytics:${user._id.toString()}:some-hash`;
    await redis.set(cacheKey, 'some-cached-data');

    const options = {
      model: 'gemini-1.5-flash',
      message: 'Hello!',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Test Agent',
    };

    await aiService.handleChat(user._id.toString(), options);

    const cached = await redis.get(cacheKey);
    expect(cached).toBeNull();
  });
});
