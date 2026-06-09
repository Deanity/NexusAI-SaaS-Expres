import { Router } from 'express';
import * as aiController from './ai.controller';
import { authenticate } from '@/shared/middleware/authenticate';
import { requireVerified } from '@/shared/middleware/requireVerified';
import { requireScope } from '@/shared/middleware/requireScope';
import { ApiKeyScope } from '@/modules/apikey/apiKey.model';
import { checkPlanLimit } from '@/shared/middleware/checkPlanLimit';
import { validate } from '@/shared/middleware/validate';
import { chatSchema } from './ai.schema';
import { createRateLimiter } from '@/shared/middleware/rateLimiter';
import { getCurrentSubscription } from '@/modules/subscription/subscription.service';
import { PlanDocument } from '@/modules/subscription/plan.model';

const router = Router();

const aiChatLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: async (req): Promise<number> => {
    const userId = req.user?.sub;
    if (!userId) return 30; // Fallback to free limit

    try {
      const subscription = await getCurrentSubscription(userId);
      if (subscription && subscription.planId) {
        const plan = subscription.planId as unknown as PlanDocument;
        if (plan && plan.slug !== 'free') {
          return 120;
        }
      }
    } catch (error) {
      console.error('[AI_CHAT_LIMITER] Error fetching user subscription for rate limit:', error);
    }
    return 30;
  },
  keyPrefix: 'ai_chat',
});

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: Multi-model AI chat routing and operations
 */

/**
 * @swagger
 * /api/v1/ai/chat:
 *   post:
 *     summary: Send a message to an AI model (streaming or non-streaming)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - model
 *               - message
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: Omit this to start a new conversation. If provided, appends the message to the conversation.
 *                 example: 60b7c7b2f63f5b2b3a4a5a6a
 *               model:
 *                 type: string
 *                 description: The AI model to use.
 *                 enum: [gemini-1.5-pro, gemini-1.5-flash]
 *                 example: gemini-1.5-flash
 *               message:
 *                 type: string
 *                 description: The user's new message content.
 *                 example: Hello, tell me a joke.
 *               systemPrompt:
 *                 type: string
 *                 description: Custom system instructions. Ignored if conversationId is provided.
 *                 example: You are a professional comedian.
 *               stream:
 *                 type: boolean
 *                 description: Whether to stream the response back using Server-Sent Events (SSE).
 *                 default: false
 *                 example: false
 *     responses:
 *       200:
 *         description: AI response returned (non-streaming)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: AI response generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversationId:
 *                       type: string
 *                     message:
 *                       type: object
 *                       properties:
 *                         role:
 *                           type: string
 *                           example: assistant
 *                         content:
 *                           type: string
 *                           example: Why did the chicken cross the road?
 *       201:
 *         description: Streaming started (if stream=true)
 *         headers:
 *           Content-Type:
 *             schema:
 *               type: string
 *               example: text/event-stream
 *           Cache-Control:
 *             schema:
 *               type: string
 *               example: no-cache
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized (Token or API Key missing/invalid)
 *       403:
 *         description: Forbidden (Unverified email or IP blocked)
 *       422:
 *         description: Model not available, daily limit reached, or insufficient credits
 *       429:
 *         description: Rate limit exceeded
 *       503:
 *         description: AI provider service unavailable
 */
router.post(
  '/chat',
  authenticate,
  requireVerified,
  requireScope(ApiKeyScope.CHAT_WRITE),
  aiChatLimiter,
  validate(chatSchema),
  checkPlanLimit,
  aiController.chat
);

export default router;
