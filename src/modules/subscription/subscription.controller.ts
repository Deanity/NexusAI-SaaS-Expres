import { Request, Response } from 'express';
import * as subscriptionService from '@/modules/subscription/subscription.service';
import { sendSuccess } from '@/shared/utils/response';
import { AppError } from '@/shared/errors/AppError';
import { redis } from '@/config/redis';

export const getPlans = async (_req: Request, res: Response): Promise<void> => {
  const cached = await redis.get('plan:all');
  res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
  const plans = await subscriptionService.getActivePlans();
  sendSuccess(res, 200, 'Plans retrieved successfully', plans);
};

export const getPlanBySlug = async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;
  const cached = await redis.get(`plan:${slug}`);
  res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
  const plan = await subscriptionService.getPlanBySlug(slug);
  if (!plan) {
    throw new AppError('Plan not found', 404, 'NOT_FOUND');
  }
  sendSuccess(res, 200, 'Plan retrieved successfully', plan);
};

export const subscribe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'TOKEN_INVALID');
  }

  const { planId } = req.body;
  const subscription = await subscriptionService.subscribe(req.user.sub, planId);
  sendSuccess(res, 201, 'Subscribed successfully', subscription);
};

export const getCurrentSubscription = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'TOKEN_INVALID');
  }

  const subscription = await subscriptionService.getCurrentSubscription(req.user.sub);
  if (!subscription) {
    throw new AppError('No active subscription found', 404, 'NOT_FOUND');
  }

  sendSuccess(res, 200, 'Current subscription retrieved successfully', subscription);
};

export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'TOKEN_INVALID');
  }

  const subscription = await subscriptionService.cancelSubscription(req.user.sub);
  sendSuccess(res, 200, 'Subscription cancelled successfully at period end', subscription);
};
