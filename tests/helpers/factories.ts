import mongoose from 'mongoose';
import { User, UserDocument } from '@/modules/user/user.model';
import { Plan, PlanDocument } from '@/modules/subscription/plan.model';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
} from '@/modules/subscription/subscription.model';
import { ApiKey, ApiKeyDocument, ApiKeyScope } from '@/modules/apikey/apiKey.model';
import { generateApiKeyString } from '@/modules/apikey/apiKey.service';
import { hashSHA256 } from '@/shared/utils/hash';

export const createTestUser = async (
  overrides: Partial<UserDocument> = {}
): Promise<UserDocument> => {
  const uniqueId = new mongoose.Types.ObjectId();
  const defaultUser = {
    email: `testuser-${uniqueId}@example.com`,
    password: 'Password123',
    name: 'Test User',
    role: 'user' as const,
    isEmailVerified: true,
    isActive: true,
    credits: 100,
    subscriptionId: null,
  };

  return User.create({ ...defaultUser, ...overrides });
};

export const createTestPlan = async (
  overrides: Partial<PlanDocument> = {}
): Promise<PlanDocument> => {
  const uniqueId = new mongoose.Types.ObjectId();
  const defaultPlan = {
    name: `Premium Plan-${uniqueId}`,
    slug: `slug-${uniqueId}`,
    price: 1500,
    currency: 'USD',
    billingCycle: 'monthly' as const,
    creditsPerCycle: 1000,
    features: {
      maxApiKeys: 5,
      maxConversations: -1,
      maxMessagesPerDay: -1,
      allowedModels: ['gemini-1.5-pro', 'gemini-1.5-flash'],
      priorityQueue: true,
      analyticsRetentionDays: 90,
    },
    isActive: true,
  };

  const mergedFeatures = overrides.features
    ? { ...defaultPlan.features, ...overrides.features }
    : defaultPlan.features;

  return Plan.create({
    ...defaultPlan,
    ...overrides,
    features: mergedFeatures,
  });
};

export const createTestSubscription = async (
  userId: string,
  planId: string,
  overrides: Partial<SubscriptionDocument> = {}
): Promise<SubscriptionDocument> => {
  const defaultSubscription = {
    userId: new mongoose.Types.ObjectId(userId),
    planId: new mongoose.Types.ObjectId(planId),
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
  };

  return Subscription.create({ ...defaultSubscription, ...overrides });
};

export const createTestApiKey = async (
  userId: string,
  overrides: Partial<ApiKeyDocument> = {}
): Promise<{ rawKey: string; keyDoc: ApiKeyDocument }> => {
  const rawKey = generateApiKeyString();
  const keyPrefix = rawKey.substring(0, 8);
  const keyHash = hashSHA256(rawKey);

  const defaultApiKey = {
    userId: new mongoose.Types.ObjectId(userId),
    name: 'Test API Key',
    keyPrefix,
    keyHash,
    scopes: [ApiKeyScope.CHAT_WRITE, ApiKeyScope.HISTORY_READ],
    usageCount: 0,
    lastUsedAt: null,
    expiresAt: null,
    isActive: true,
    ipWhitelist: [],
  };

  const keyDoc = await ApiKey.create({ ...defaultApiKey, ...overrides });

  return {
    rawKey,
    keyDoc,
  };
};
