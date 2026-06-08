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
