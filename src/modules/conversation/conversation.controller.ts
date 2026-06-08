import { Request, Response } from 'express';
import * as conversationService from './conversation.service';
import { sendSuccess } from '@/shared/utils/response';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { AppError } from '@/shared/errors/AppError';

export const createConversation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
    }

    const { model, title, systemPrompt } = req.body;
    const conversation = await conversationService.createConversation(
      userId,
      model,
      title,
      systemPrompt
    );

    sendSuccess(res, 201, 'Conversation created successfully', conversation);
  }
);

export const getConversations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const page = Number(req.query.page);
  const limit = Number(req.query.limit);
  const archived = req.query.archived === 'true';

  const { conversations, meta } = await conversationService.getConversationsList(
    userId,
    page,
    limit,
    archived
  );

  sendSuccess(res, 200, 'Conversations retrieved successfully', conversations, meta);
});

export const getConversationDetails = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
    }

    const { id } = req.params;
    const { conversation, messages } = await conversationService.getConversationDetails(userId, id);

    sendSuccess(res, 200, 'Conversation details retrieved successfully', {
      ...conversation.toObject(),
      messages,
    });
  }
);

export const updateConversation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
    }

    const { id } = req.params;
    const { title, systemPrompt, isPinned, isArchived } = req.body;

    const conversation = await conversationService.updateConversation(userId, id, {
      title,
      systemPrompt,
      isPinned,
      isArchived,
    });

    sendSuccess(res, 200, 'Conversation updated successfully', conversation);
  }
);

export const deleteConversation = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
    }

    const { id } = req.params;
    // DELETE soft delete preferred: set isArchived to true
    const conversation = await conversationService.archiveConversation(userId, id);

    sendSuccess(res, 200, 'Conversation archived successfully', conversation);
  }
);

export const getConversationMessages = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
    }

    const { id } = req.params;
    const page = Number(req.query.page);
    const limit = Number(req.query.limit);

    const { messages, meta } = await conversationService.getConversationMessages(
      userId,
      id,
      page,
      limit
    );

    sendSuccess(res, 200, 'Messages retrieved successfully', messages, meta);
  }
);

export const clearConversationMessages = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
    }

    const { id } = req.params;
    await conversationService.clearConversationMessages(userId, id);

    sendSuccess(res, 200, 'Conversation messages cleared successfully', null);
  }
);
