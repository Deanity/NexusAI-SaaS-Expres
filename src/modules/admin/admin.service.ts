import crypto from 'crypto';
import mongoose from 'mongoose';
import { User, UserDocument } from '@/modules/user/user.model';
import { Plan, PlanDocument } from '@/modules/subscription/plan.model';
import { Subscription, SubscriptionStatus } from '@/modules/subscription/subscription.model';
import { UsageEvent, UsageEventType } from '@/modules/analytics/usageEvent.model';
import { Message } from '@/modules/conversation/message.model';
import { CreditAction } from '@/modules/credit/creditLedger.model';
import { redis } from '@/config/redis';
import { AppError } from '@/shared/errors/AppError';
import { getPaginationMeta } from '@/shared/utils/pagination';
import * as creditService from '@/modules/credit/credit.service';
import * as authRepository from '@/modules/auth/auth.repository';

export interface AdminOverviewAnalytics {
  totalUsers: number;
  totalMessages: number;
  totalTokensUsed: number;
  totalCreditsUsed: number;
  mostUsedModel: string;
  averageLatencyMs: number;
  activeSubscriptions: number;
  period: {
    from: Date;
    to: Date;
  };
}

export interface UserUsageBreakdownItem {
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  messagesCount: number;
  tokensUsed: number;
  creditsUsed: number;
}

export interface PaginatedUsers {
  users: UserDocument[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedUserUsage {
  breakdown: UserUsageBreakdownItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const getUsers = async (
  page: number,
  limit: number,
  search?: string,
  sort?: string
): Promise<PaginatedUsers> => {
  const skip = (page - 1) * limit;
  const filter: mongoose.FilterQuery<UserDocument> = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const sortOption = sort || '-createdAt';

  const [users, total] = await Promise.all([
    User.find(filter).select('-password').sort(sortOption).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  const meta = getPaginationMeta(page, limit, total);

  return {
    users,
    meta,
  };
};

export const getUserById = async (id: string): Promise<UserDocument> => {
  const user = await User.findById(id).select('-password');
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return user;
};

export const updateUserStatus = async (id: string, isActive: boolean): Promise<UserDocument> => {
  const user = await User.findByIdAndUpdate(id, { $set: { isActive } }, { new: true }).select(
    '-password'
  );

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  // Banned user
  if (!isActive) {
    await authRepository.revokeAllUserTokens(id);
  }

  return user;
};

export const updateUserRole = async (id: string, role: 'user' | 'admin'): Promise<UserDocument> => {
  const user = await User.findByIdAndUpdate(id, { $set: { role } }, { new: true }).select(
    '-password'
  );

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  return user;
};

export const adjustCredits = async (
  userId: string,
  amount: number,
  description: string
): Promise<UserDocument> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (amount > 0) {
    await creditService.addCredits(
      userId,
      amount,
      CreditAction.ADMIN_ADJUST,
      null,
      'Manual',
      description
    );
  } else if (amount < 0) {
    await creditService.deductCredits(
      userId,
      Math.abs(amount),
      CreditAction.ADMIN_ADJUST,
      null,
      'Manual',
      description
    );
  }

  const updatedUser = await User.findById(userId).select('-password');
  if (!updatedUser) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  return updatedUser;
};

export const createPlan = async (planData: Partial<PlanDocument>): Promise<PlanDocument> => {
  const existing = await Plan.findOne({ slug: planData.slug });
  if (existing) {
    throw new AppError('Plan slug already exists', 409, 'CONFLICT');
  }

  const plan = await Plan.create(planData);
  await redis.del('plan:all');
  return plan;
};

export const updatePlan = async (
  id: string,
  planData: Partial<PlanDocument>
): Promise<PlanDocument> => {
  const oldPlan = await Plan.findById(id);
  if (!oldPlan) {
    throw new AppError('Plan not found', 404, 'NOT_FOUND');
  }

  if (planData.slug && planData.slug !== oldPlan.slug) {
    const existing = await Plan.findOne({ slug: planData.slug, _id: { $ne: id } });
    if (existing) {
      throw new AppError('Plan slug already exists', 409, 'CONFLICT');
    }
  }

  const plan = await Plan.findByIdAndUpdate(id, { $set: planData }, { new: true });
  if (!plan) {
    throw new AppError('Plan not found', 404, 'NOT_FOUND');
  }

  await redis.del('plan:all');
  await redis.del(`plan:${oldPlan.slug}`);
  if (plan.slug !== oldPlan.slug) {
    await redis.del(`plan:${plan.slug}`);
  }

  return plan;
};

export const deletePlan = async (id: string): Promise<PlanDocument> => {
  const plan = await Plan.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
  if (!plan) {
    throw new AppError('Plan not found', 404, 'NOT_FOUND');
  }

  await redis.del('plan:all');
  await redis.del(`plan:${plan.slug}`);

  return plan;
};

export const getAdminOverview = async (from: Date, to: Date): Promise<AdminOverviewAnalytics> => {
  const rangeHash = crypto
    .createHash('md5')
    .update(`${from.toISOString()}-${to.toISOString()}-admin-overview`)
    .digest('hex');
  const cacheKey = `analytics:admin:${rangeHash}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as AdminOverviewAnalytics;
  }

  const [totalUsers, activeSubscriptions] = await Promise.all([
    User.countDocuments(),
    Subscription.countDocuments({
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
    }),
  ]);

  const totalMessages = await UsageEvent.countDocuments({
    eventType: UsageEventType.AI_CHAT,
    timestamp: { $gte: from, $lte: to },
  });

  const usageStats = await UsageEvent.aggregate([
    {
      $match: {
        timestamp: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: null,
        totalTokens: { $sum: '$tokensUsed' },
        totalCredits: { $sum: '$creditsUsed' },
      },
    },
  ]);

  const totalTokensUsed = usageStats[0]?.totalTokens || 0;
  const totalCreditsUsed = usageStats[0]?.totalCredits || 0;

  const modelStats = await UsageEvent.aggregate([
    {
      $match: {
        eventType: UsageEventType.AI_CHAT,
        timestamp: { $gte: from, $lte: to },
        model: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$model',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 1 },
  ]);

  const mostUsedModel = modelStats[0]?._id || 'none';

  const latencyStats = await Message.aggregate([
    {
      $match: {
        role: 'assistant',
        createdAt: { $gte: from, $lte: to },
        latencyMs: { $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        avgLatency: { $avg: '$latencyMs' },
      },
    },
  ]);

  const averageLatencyMs = Math.round(latencyStats[0]?.avgLatency || 0);

  const result: AdminOverviewAnalytics = {
    totalUsers,
    totalMessages,
    totalTokensUsed,
    totalCreditsUsed,
    mostUsedModel,
    averageLatencyMs,
    activeSubscriptions,
    period: {
      from,
      to,
    },
  };

  // Cache for 5 minutes (300 seconds)
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);

  return result;
};

export const getAdminUsersBreakdown = async (
  from: Date,
  to: Date,
  page: number,
  limit: number
): Promise<PaginatedUserUsage> => {
  const skip = (page - 1) * limit;
  const rangeHash = crypto
    .createHash('md5')
    .update(`${from.toISOString()}-${to.toISOString()}-admin-users`)
    .digest('hex');
  const cacheKey = `analytics:admin:${rangeHash}:${page}:${limit}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as PaginatedUserUsage;
  }

  const result = await UsageEvent.aggregate([
    {
      $match: {
        timestamp: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: '$userId',
        messagesCount: {
          $sum: { $cond: [{ $eq: ['$eventType', UsageEventType.AI_CHAT] }, 1, 0] },
        },
        tokensUsed: { $sum: '$tokensUsed' },
        creditsUsed: { $sum: '$creditsUsed' },
      },
    },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: { creditsUsed: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'userDetails',
            },
          },
          {
            $unwind: {
              path: '$userDetails',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              userId: '$_id',
              name: '$userDetails.name',
              email: '$userDetails.email',
              messagesCount: 1,
              tokensUsed: 1,
              creditsUsed: 1,
            },
          },
        ],
      },
    },
  ]);

  const breakdownRaw = (result[0]?.data || []) as Array<{
    userId: mongoose.Types.ObjectId;
    name?: string;
    email?: string;
    messagesCount: number;
    tokensUsed: number;
    creditsUsed: number;
  }>;
  const breakdown: UserUsageBreakdownItem[] = breakdownRaw.map((item) => ({
    userId: item.userId,
    name: item.name || 'Unknown',
    email: item.email || 'unknown@nexusai.dev',
    messagesCount: item.messagesCount,
    tokensUsed: item.tokensUsed,
    creditsUsed: item.creditsUsed,
  }));

  const total = result[0]?.metadata[0]?.total || 0;
  const meta = getPaginationMeta(page, limit, total);

  const response: PaginatedUserUsage = {
    breakdown,
    meta,
  };

  // Cache for 5 minutes (300 seconds)
  await redis.set(cacheKey, JSON.stringify(response), 'EX', 300);

  return response;
};
