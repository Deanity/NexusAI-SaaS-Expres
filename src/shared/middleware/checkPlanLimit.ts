import { Request, Response, NextFunction, RequestHandler } from 'express';
import { getCurrentSubscription } from '@/modules/subscription/subscription.service';
import { Plan, PlanDocument } from '@/modules/subscription/plan.model';
import { UsageEvent, UsageEventType } from '@/modules/analytics/usageEvent.model';
import { AppError } from '@/shared/errors/AppError';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { env } from '@/config/env';

export const checkPlanLimit: RequestHandler = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.sub;
    if (!userId) {
      throw new AppError('Authentication required', 401, 'TOKEN_INVALID');
    }

    const { model } = req.body;

    // 1. Get active plan
    let plan: PlanDocument | null = null;
    const subscription = await getCurrentSubscription(userId);

    if (subscription && subscription.planId) {
      plan = subscription.planId as unknown as PlanDocument;
    } else {
      // Fallback to Free plan
      plan = await Plan.findOne({ slug: 'free' });
    }

    if (!plan) {
      throw new AppError('No active subscription or plan found', 422, 'PLAN_NOT_FOUND');
    }

    // 2. Validate requested model
    if (model) {
      // Check if model is active in env
      if (!env.ENABLED_MODELS.includes(model)) {
        throw new AppError(`Model ${model} is not available`, 422, 'MODEL_NOT_AVAILABLE');
      }

      // Check if model is allowed by user's plan
      if (!plan.features.allowedModels.includes(model)) {
        throw new AppError(
          `Model ${model} is not allowed under your plan`,
          422,
          'MODEL_NOT_AVAILABLE'
        );
      }
    }

    // 3. Check daily message limit
    const maxMessagesPerDay = plan.features.maxMessagesPerDay;
    if (maxMessagesPerDay !== -1) {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setUTCHours(23, 59, 59, 999);

      const messageCountToday = await UsageEvent.countDocuments({
        userId,
        eventType: UsageEventType.AI_CHAT,
        timestamp: { $gte: startOfDay, $lte: endOfDay },
      });

      if (messageCountToday >= maxMessagesPerDay) {
        throw new AppError('Daily message limit reached', 422, 'PLAN_LIMIT_REACHED');
      }
    }

    next();
  }
);
