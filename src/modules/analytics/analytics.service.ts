import crypto from 'crypto';
import mongoose from 'mongoose';
import { redis } from '@/config/redis';
import { UsageEvent, UsageEventType } from './usageEvent.model';
import { Message } from '@/modules/conversation/message.model';

export interface OverviewAnalytics {
  totalMessages: number;
  totalTokensUsed: number;
  totalCreditsUsed: number;
  mostUsedModel: string;
  averageLatencyMs: number;
  period: {
    from: Date;
    to: Date;
  };
}

export interface DailyBreakdownItem {
  date: string;
  creditsUsed: number;
  tokensUsed: number;
  messagesCount: number;
}

export interface ModelBreakdownItem {
  model: string;
  creditsUsed: number;
  tokensUsed: number;
  messagesCount: number;
}

export interface ApiKeyBreakdownItem {
  apiKeyId: mongoose.Types.ObjectId;
  keyName: string;
  keyPrefix: string;
  creditsUsed: number;
  tokensUsed: number;
  apiCallsCount: number;
}

const getCachedOrAggregate = async <T>(
  userId: string,
  type: string,
  from: Date,
  to: Date,
  aggregateFn: () => Promise<T>
): Promise<T> => {
  const rangeHash = crypto
    .createHash('md5')
    .update(`${from.toISOString()}-${to.toISOString()}-${type}`)
    .digest('hex');
  const cacheKey = `analytics:${userId}:${rangeHash}`;

  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData) as T;
  }

  const result = await aggregateFn();
  // Cache for 10 minutes (600 seconds)
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 600);

  return result;
};

export const getOverview = async (
  userId: string,
  from: Date,
  to: Date
): Promise<OverviewAnalytics> => {
  return getCachedOrAggregate<OverviewAnalytics>(userId, 'overview', from, to, async () => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1. Aggregate tokens, credits, and message count
    const usageStats = await UsageEvent.aggregate([
      {
        $match: {
          userId: userObjectId,
          timestamp: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $group: {
          _id: null,
          totalMessages: {
            $sum: { $cond: [{ $eq: ['$eventType', UsageEventType.AI_CHAT] }, 1, 0] },
          },
          totalTokensUsed: { $sum: '$tokensUsed' },
          totalCreditsUsed: { $sum: '$creditsUsed' },
        },
      },
    ]);

    // 2. Aggregate average latency from Messages
    const messageStats = await Message.aggregate([
      {
        $match: {
          userId: userObjectId,
          role: 'assistant',
          createdAt: { $gte: fromDate, $lte: toDate },
          latencyMs: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          averageLatencyMs: { $avg: '$latencyMs' },
        },
      },
    ]);

    // 3. Aggregate most used model
    const modelStats = await UsageEvent.aggregate([
      {
        $match: {
          userId: userObjectId,
          eventType: UsageEventType.AI_CHAT,
          timestamp: { $gte: fromDate, $lte: toDate },
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

    const stats = usageStats[0] || { totalMessages: 0, totalTokensUsed: 0, totalCreditsUsed: 0 };
    const avgLatency = messageStats[0]?.averageLatencyMs || 0;
    const mostUsedModel = modelStats[0]?._id || 'none';

    return {
      totalMessages: stats.totalMessages,
      totalTokensUsed: stats.totalTokensUsed,
      totalCreditsUsed: stats.totalCreditsUsed,
      mostUsedModel,
      averageLatencyMs: Math.round(avgLatency),
      period: {
        from,
        to,
      },
    };
  });
};

export const getDailyBreakdown = async (
  userId: string,
  from: Date,
  to: Date
): Promise<DailyBreakdownItem[]> => {
  return getCachedOrAggregate<DailyBreakdownItem[]>(userId, 'daily', from, to, async () => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const dailyStats = await UsageEvent.aggregate([
      {
        $match: {
          userId: userObjectId,
          timestamp: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          creditsUsed: { $sum: '$creditsUsed' },
          tokensUsed: { $sum: '$tokensUsed' },
          messagesCount: {
            $sum: { $cond: [{ $eq: ['$eventType', UsageEventType.AI_CHAT] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return dailyStats.map((stat) => ({
      date: stat._id,
      creditsUsed: stat.creditsUsed,
      tokensUsed: stat.tokensUsed,
      messagesCount: stat.messagesCount,
    }));
  });
};

export const getModelBreakdown = async (
  userId: string,
  from: Date,
  to: Date
): Promise<ModelBreakdownItem[]> => {
  return getCachedOrAggregate<ModelBreakdownItem[]>(userId, 'models', from, to, async () => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const modelStats = await UsageEvent.aggregate([
      {
        $match: {
          userId: userObjectId,
          eventType: UsageEventType.AI_CHAT,
          timestamp: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $group: {
          _id: '$model',
          creditsUsed: { $sum: '$creditsUsed' },
          tokensUsed: { $sum: '$tokensUsed' },
          messagesCount: { $sum: 1 },
        },
      },
      { $sort: { creditsUsed: -1 } },
    ]);

    return modelStats.map((stat) => ({
      model: stat._id || 'unknown',
      creditsUsed: stat.creditsUsed,
      tokensUsed: stat.tokensUsed,
      messagesCount: stat.messagesCount,
    }));
  });
};

export const getApiKeyBreakdown = async (
  userId: string,
  from: Date,
  to: Date
): Promise<ApiKeyBreakdownItem[]> => {
  return getCachedOrAggregate<ApiKeyBreakdownItem[]>(userId, 'api-keys', from, to, async () => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const apiKeyStats = await UsageEvent.aggregate([
      {
        $match: {
          userId: userObjectId,
          timestamp: { $gte: fromDate, $lte: toDate },
          apiKeyId: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$apiKeyId',
          creditsUsed: { $sum: '$creditsUsed' },
          tokensUsed: { $sum: '$tokensUsed' },
          apiCallsCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'apikeys',
          localField: '_id',
          foreignField: '_id',
          as: 'keyDetails',
        },
      },
      {
        $project: {
          _id: 1,
          creditsUsed: 1,
          tokensUsed: 1,
          apiCallsCount: 1,
          keyName: { $arrayElemAt: ['$keyDetails.name', 0] },
          keyPrefix: { $arrayElemAt: ['$keyDetails.keyPrefix', 0] },
        },
      },
      { $sort: { creditsUsed: -1 } },
    ]);

    return apiKeyStats.map((stat) => ({
      apiKeyId: stat._id,
      keyName: stat.keyName || 'Revoked Key',
      keyPrefix: stat.keyPrefix || 'unknown',
      creditsUsed: stat.creditsUsed,
      tokensUsed: stat.tokensUsed,
      apiCallsCount: stat.apiCallsCount,
    }));
  });
};
