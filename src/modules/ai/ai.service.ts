import mongoose from 'mongoose';
import { Conversation, ConversationDocument } from '@/modules/conversation/conversation.model';
import { Message, MessageDocument } from '@/modules/conversation/message.model';
import { UsageEvent, UsageEventType } from '@/modules/analytics/usageEvent.model';
import { deductCredits, getBalance } from '@/modules/credit/credit.service';
import { CreditAction } from '@/modules/credit/creditLedger.model';
import { redis } from '@/config/redis';
import { GoogleProvider } from './providers/google.provider';
import { env } from '@/config/env';
import { AppError } from '@/shared/errors/AppError';
import { ProviderMessage } from './providers/base.provider';

const googleProvider = new GoogleProvider();

export interface ChatOptions {
  conversationId?: string;
  model: string;
  message: string;
  systemPrompt?: string;
  stream?: boolean;
  ipAddress: string;
  userAgent: string;
  apiKeyId?: string;
}

export interface ChatResult {
  conversationId: string;
  message: MessageDocument;
  userMessage: MessageDocument;
}

export const getModelRate = (model: string): number => {
  if (model === 'gemini-1.5-pro') return env.CREDIT_RATE_GEMINI_PRO;
  if (model === 'gemini-1.5-flash') return env.CREDIT_RATE_GEMINI_FLASH;
  // Future models
  if (model === 'gpt-4o') return 10;
  if (model === 'gpt-4o-mini') return 2;
  if (model === 'claude-3-5-sonnet') return 8;
  if (model === 'claude-3-haiku') return 1;
  return 2; // default fallback
};

export const estimatePromptTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

export const calculateCreditCost = (model: string, tokens: number): number => {
  const rate = getModelRate(model);
  return parseFloat(((tokens / 1000) * rate).toFixed(4));
};

export const handleChat = async (
  userId: string,
  options: ChatOptions,
  onChunk?: (chunk: string) => void
): Promise<ChatResult> => {
  const { conversationId, model, message, systemPrompt } = options;

  // 1. Get current user credit balance
  const balance = await getBalance(userId);

  // 2. Fetch or create conversation
  let conversation: ConversationDocument | null = null;
  if (conversationId) {
    conversation = await Conversation.findOne({ _id: conversationId, userId });
    if (!conversation) {
      throw new AppError('Conversation not found', 404, 'NOT_FOUND');
    }
  }

  // 3. Fetch recent messages context (limit to last 10 messages)
  let contextMessages: MessageDocument[] = [];
  if (conversation) {
    contextMessages = await Message.find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .limit(10);
    contextMessages.reverse(); // put back in chronological order
  }

  // 4. Map context + current message to provider format
  const providerMessages: ProviderMessage[] = contextMessages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
  providerMessages.push({
    role: 'user',
    content: message,
  });

  // 5. Pre-check user balance using estimated tokens
  const systemPromptToUse = systemPrompt || conversation?.systemPrompt;
  const fullText = providerMessages.map((m) => m.content).join(' ') + (systemPromptToUse || '');
  const estPromptTokens = estimatePromptTokens(fullText);
  const estCompletionTokens = 500; // safe completion buffer
  const estTotalTokens = estPromptTokens + estCompletionTokens;
  const estCost = calculateCreditCost(model, estTotalTokens);

  if (balance < estCost) {
    throw new AppError(
      'Insufficient credits for this request. Please top up your balance.',
      422,
      'INSUFFICIENT_CREDITS'
    );
  }

  // 6. Ensure Conversation exists (create if not exist)
  let conversationDoc = conversation;
  if (!conversationDoc) {
    const title = message.length > 60 ? message.substring(0, 60) + '...' : message;
    conversationDoc = await Conversation.create({
      userId,
      title,
      model,
      systemPrompt: systemPrompt || null,
      messageCount: 0,
      totalTokensUsed: 0,
      isArchived: false,
      isPinned: false,
      lastMessageAt: new Date(),
    });
  }

  // 7. Invoke provider call
  const start = Date.now();
  let response;

  if (options.stream && onChunk) {
    // Write conversationId first to help client identify new chats
    onChunk(JSON.stringify({ conversationId: conversationDoc._id.toString() }));

    response = await googleProvider.chatStream(
      providerMessages,
      model,
      {
        temperature: 0.7,
        systemPrompt: systemPromptToUse,
      },
      (textChunk) => {
        onChunk(JSON.stringify({ text: textChunk }));
      }
    );
  } else {
    response = await googleProvider.chat(providerMessages, model, {
      temperature: 0.7,
      systemPrompt: systemPromptToUse,
    });
  }

  const latencyMs = Date.now() - start;

  // 8. Save User message to DB
  const userMsg = await Message.create({
    conversationId: conversationDoc._id,
    userId,
    role: 'user',
    content: message,
    tokensUsed: estPromptTokens,
    creditsDeducted: 0,
    latencyMs: null,
    finishReason: null,
    metadata: {},
  });

  // 9. Save Assistant message to DB
  const cost = calculateCreditCost(model, response.tokensUsed);
  const assistantMsg = await Message.create({
    conversationId: conversationDoc._id,
    userId,
    role: 'assistant',
    content: response.content,
    model,
    tokensUsed: response.tokensUsed,
    creditsDeducted: cost,
    latencyMs,
    finishReason: response.finishReason,
    metadata: {},
  });

  // 10. Deduct actual credits
  if (cost > 0) {
    await deductCredits(
      userId,
      cost,
      CreditAction.AI_USAGE,
      assistantMsg._id.toString(),
      'Message',
      `AI Chat using ${model}`
    );
  }

  // 11. Update conversation metadata
  conversationDoc.messageCount += 2;
  conversationDoc.totalTokensUsed += userMsg.tokensUsed + assistantMsg.tokensUsed;
  conversationDoc.lastMessageAt = new Date();
  await conversationDoc.save();

  // 12. Create Usage Event log for analytics
  await UsageEvent.create({
    userId,
    eventType: UsageEventType.AI_CHAT,
    model,
    tokensUsed: response.tokensUsed,
    creditsUsed: cost,
    conversationId: conversationDoc._id,
    apiKeyId: options.apiKeyId ? new mongoose.Types.ObjectId(options.apiKeyId) : null,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    timestamp: new Date(),
  });

  // 13. Invalidate analytics cache
  await invalidateAnalyticsCache(userId);

  return {
    conversationId: conversationDoc._id.toString(),
    message: assistantMsg,
    userMessage: userMsg,
  };
};

export const invalidateAnalyticsCache = async (userId: string): Promise<void> => {
  const pattern = `analytics:${userId}:*`;
  let cursor = '0';
  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = newCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
};
