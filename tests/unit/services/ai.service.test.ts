import * as aiService from '@/modules/ai/ai.service';
import { GoogleProvider } from '@/modules/ai/providers/google.provider';
import { createTestUser } from '../../helpers/factories';
import { User } from '@/modules/user/user.model';
import { Message } from '@/modules/conversation/message.model';
import { UsageEvent, UsageEventType } from '@/modules/analytics/usageEvent.model';
import { AppError } from '@/shared/errors/AppError';

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
});
