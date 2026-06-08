import mongoose from 'mongoose';
import { Plan, PlanDocument } from '@/modules/subscription/plan.model';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
} from '@/modules/subscription/subscription.model';
import { User } from '@/modules/user/user.model';
import { AppError } from '@/shared/errors/AppError';
import { addCredits } from '@/modules/credit/credit.service';
import { CreditAction } from '@/modules/credit/creditLedger.model';
import { redis } from '@/config/redis';

export const getActivePlans = async (): Promise<PlanDocument[]> => {
  const cached = await redis.get('plan:all');
  if (cached) {
    return JSON.parse(cached) as PlanDocument[];
  }
  const plans = await Plan.find({ isActive: true });
  await redis.set('plan:all', JSON.stringify(plans), 'EX', 3600);
  return plans;
};

export const getPlanBySlug = async (slug: string): Promise<PlanDocument | null> => {
  const cacheKey = `plan:${slug}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as PlanDocument | null;
  }
  const plan = await Plan.findOne({ slug, isActive: true });
  if (plan) {
    await redis.set(cacheKey, JSON.stringify(plan), 'EX', 3600);
  }
  return plan;
};

export const getCurrentSubscription = async (
  userId: string
): Promise<SubscriptionDocument | null> => {
  return Subscription.findOne({
    userId,
    status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
  }).populate('planId');
};

export const subscribe = async (userId: string, planId: string): Promise<SubscriptionDocument> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const plan = await Plan.findById(planId);
  if (!plan || !plan.isActive) {
    throw new AppError('Selected plan is invalid or inactive', 400, 'VALIDATION_ERROR');
  }

  // Find and deactivate any existing active subscription
  await Subscription.updateMany(
    {
      userId,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
    },
    {
      $set: {
        status: SubscriptionStatus.EXPIRED,
        cancelledAt: new Date(),
      },
    }
  );

  // Calculate period dates (default 30 days)
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Create new subscription
  const subscription = await Subscription.create({
    userId,
    planId: plan._id,
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: false,
  });

  // Update User's subscription link
  user.subscriptionId = subscription._id as mongoose.Types.ObjectId;
  await user.save();

  // Grant credits using CreditService
  await addCredits(
    userId,
    plan.creditsPerCycle,
    CreditAction.SUBSCRIPTION,
    subscription._id.toString(),
    'Subscription',
    `Credits grant for subscription plan: ${plan.name}`
  );

  return subscription;
};

export const cancelSubscription = async (userId: string): Promise<SubscriptionDocument> => {
  const subscription = await Subscription.findOne({
    userId,
    status: SubscriptionStatus.ACTIVE,
  });

  if (!subscription) {
    throw new AppError('No active subscription found to cancel', 404, 'NOT_FOUND');
  }

  subscription.cancelAtPeriodEnd = true;
  subscription.cancelledAt = new Date();
  await subscription.save();

  return subscription;
};
