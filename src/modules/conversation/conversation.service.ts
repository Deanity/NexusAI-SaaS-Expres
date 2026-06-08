import { Conversation, ConversationDocument } from './conversation.model';
import { Message, MessageDocument } from './message.model';
import { AppError } from '@/shared/errors/AppError';
import { getPaginationMeta } from '@/shared/utils/pagination';

export const createConversation = async (
  userId: string,
  model: string,
  title?: string,
  systemPrompt?: string
): Promise<ConversationDocument> => {
  const conversationTitle = title || 'New Conversation';
  return Conversation.create({
    userId,
    title: conversationTitle,
    model,
    systemPrompt: systemPrompt || null,
    messageCount: 0,
    totalTokensUsed: 0,
    isArchived: false,
    isPinned: false,
    lastMessageAt: new Date(),
  });
};

export const getConversationsList = async (
  userId: string,
  page: number,
  limit: number,
  includeArchived = false
): Promise<{
  conversations: ConversationDocument[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const skip = (page - 1) * limit;
  const filter = {
    userId,
    isArchived: includeArchived,
  };

  const [conversations, total] = await Promise.all([
    Conversation.find(filter).sort({ isPinned: -1, lastMessageAt: -1 }).skip(skip).limit(limit),
    Conversation.countDocuments(filter),
  ]);

  const meta = getPaginationMeta(page, limit, total);

  return {
    conversations,
    meta,
  };
};

export const getConversationDetails = async (
  userId: string,
  conversationId: string
): Promise<{ conversation: ConversationDocument; messages: MessageDocument[] }> => {
  const conversation = await Conversation.findOne({ _id: conversationId, userId });
  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  }

  // Fetch recent messages (default: 50, oldest first)
  const messages = await Message.find({ conversationId }).sort({ createdAt: 1 }).limit(50);

  return {
    conversation,
    messages,
  };
};

export const updateConversation = async (
  userId: string,
  conversationId: string,
  updates: {
    title?: string;
    systemPrompt?: string | null;
    isPinned?: boolean;
    isArchived?: boolean;
  }
): Promise<ConversationDocument> => {
  const conversation = await Conversation.findOne({ _id: conversationId, userId });
  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  }

  if (updates.title !== undefined) conversation.title = updates.title;
  if (updates.systemPrompt !== undefined) conversation.systemPrompt = updates.systemPrompt;
  if (updates.isPinned !== undefined) conversation.isPinned = updates.isPinned;
  if (updates.isArchived !== undefined) conversation.isArchived = updates.isArchived;

  await conversation.save();
  return conversation;
};

export const archiveConversation = async (
  userId: string,
  conversationId: string
): Promise<ConversationDocument> => {
  return updateConversation(userId, conversationId, { isArchived: true });
};

export const getConversationMessages = async (
  userId: string,
  conversationId: string,
  page: number,
  limit: number
): Promise<{
  messages: MessageDocument[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const conversation = await Conversation.findOne({ _id: conversationId, userId });
  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  }

  const skip = (page - 1) * limit;
  const filter = { conversationId };

  const [messages, total] = await Promise.all([
    Message.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit),
    Message.countDocuments(filter),
  ]);

  const meta = getPaginationMeta(page, limit, total);

  return {
    messages,
    meta,
  };
};

export const clearConversationMessages = async (
  userId: string,
  conversationId: string
): Promise<void> => {
  const conversation = await Conversation.findOne({ _id: conversationId, userId });
  if (!conversation) {
    throw new AppError('Conversation not found', 404, 'NOT_FOUND');
  }

  await Message.deleteMany({ conversationId });

  conversation.messageCount = 0;
  conversation.totalTokensUsed = 0;
  await conversation.save();
};
