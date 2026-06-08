import { Request, Response } from 'express';
import * as aiService from './ai.service';
import { sendSuccess } from '@/shared/utils/response';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { AppError } from '@/shared/errors/AppError';

export const chat = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const { conversationId, model, message, systemPrompt, stream } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (stream) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      await aiService.handleChat(
        userId,
        {
          conversationId,
          model,
          message,
          systemPrompt,
          stream: true,
          ipAddress,
          userAgent,
        },
        (chunk) => {
          res.write(`data: ${chunk}\n\n`);
        }
      );

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      const errMessage = err.message || 'Stream processing failed';
      const errCode = err.code || 'AI_STREAM_ERROR';
      res.write(`data: ${JSON.stringify({ error: errMessage, code: errCode })}\n\n`);
      res.end();
    }
  } else {
    const result = await aiService.handleChat(userId, {
      conversationId,
      model,
      message,
      systemPrompt,
      stream: false,
      ipAddress,
      userAgent,
    });

    sendSuccess(res, 200, 'Response generated successfully', {
      conversationId: result.conversationId,
      message: result.message,
    });
  }
});
