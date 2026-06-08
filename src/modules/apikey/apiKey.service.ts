import crypto from 'crypto';
import { ApiKey, ApiKeyDocument, ApiKeyScope } from './apiKey.model';
import { getCurrentSubscription } from '@/modules/subscription/subscription.service';
import { Plan, PlanDocument } from '@/modules/subscription/plan.model';
import { redis } from '@/config/redis';
import { hashSHA256 } from '@/shared/utils/hash';
import { AppError } from '@/shared/errors/AppError';

export const generateApiKeyString = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'nxai_';
  const bytes = crypto.randomBytes(40);
  for (let i = 0; i < 40; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
};

export const createKey = async (
  userId: string,
  name: string,
  scopes: ApiKeyScope[],
  ipWhitelist: string[] = [],
  expiresAt: Date | null = null
): Promise<{ rawKey: string; keyDoc: ApiKeyDocument }> => {
  // 1. Get active plan
  let plan: PlanDocument | null = null;
  const subscription = await getCurrentSubscription(userId);

  if (subscription && subscription.planId) {
    plan = subscription.planId as unknown as PlanDocument;
  } else {
    plan = await Plan.findOne({ slug: 'free' });
  }

  if (!plan) {
    throw new AppError('No plan found for user subscription verification', 422, 'PLAN_NOT_FOUND');
  }

  // 2. Count active keys and enforce limit
  const activeKeysCount = await ApiKey.countDocuments({ userId, isActive: true });
  if (activeKeysCount >= plan.features.maxApiKeys) {
    throw new AppError(
      `API Key limit reached for your plan (${plan.features.maxApiKeys})`,
      422,
      'API_KEY_LIMIT_REACHED'
    );
  }

  // 3. Generate key
  const rawKey = generateApiKeyString();
  const keyPrefix = rawKey.substring(0, 8); // 'nxai_xxxx'
  const keyHash = hashSHA256(rawKey);

  const keyDoc = await ApiKey.create({
    userId,
    name,
    keyPrefix,
    keyHash,
    scopes,
    ipWhitelist,
    expiresAt,
    isActive: true,
  });

  return {
    rawKey,
    keyDoc,
  };
};

export const listKeys = async (userId: string): Promise<ApiKeyDocument[]> => {
  return ApiKey.find({ userId }).sort({ createdAt: -1 });
};

export const updateKey = async (
  userId: string,
  keyId: string,
  updates: {
    name?: string;
    scopes?: ApiKeyScope[];
    ipWhitelist?: string[];
    expiresAt?: Date | null;
  }
): Promise<ApiKeyDocument> => {
  const keyDoc = await ApiKey.findOne({ _id: keyId, userId });
  if (!keyDoc) {
    throw new AppError('API Key not found', 404, 'NOT_FOUND');
  }

  // Invalidate old cache
  await redis.del(`apikey:${keyDoc.keyHash}`);

  if (updates.name !== undefined) keyDoc.name = updates.name;
  if (updates.scopes !== undefined) keyDoc.scopes = updates.scopes;
  if (updates.ipWhitelist !== undefined) keyDoc.ipWhitelist = updates.ipWhitelist;
  if (updates.expiresAt !== undefined) keyDoc.expiresAt = updates.expiresAt;

  await keyDoc.save();

  return keyDoc;
};

export const revokeKey = async (userId: string, keyId: string): Promise<ApiKeyDocument> => {
  const keyDoc = await ApiKey.findOne({ _id: keyId, userId });
  if (!keyDoc) {
    throw new AppError('API Key not found', 404, 'NOT_FOUND');
  }

  // Invalidate cache
  await redis.del(`apikey:${keyDoc.keyHash}`);

  keyDoc.isActive = false;
  await keyDoc.save();

  return keyDoc;
};

export const rotateKey = async (
  userId: string,
  keyId: string
): Promise<{ rawKey: string; keyDoc: ApiKeyDocument }> => {
  const keyDoc = await ApiKey.findOne({ _id: keyId, userId });
  if (!keyDoc) {
    throw new AppError('API Key not found', 404, 'NOT_FOUND');
  }

  // Invalidate old cache
  await redis.del(`apikey:${keyDoc.keyHash}`);

  const rawKey = generateApiKeyString();
  const keyPrefix = rawKey.substring(0, 8);
  const keyHash = hashSHA256(rawKey);

  keyDoc.keyPrefix = keyPrefix;
  keyDoc.keyHash = keyHash;
  keyDoc.isActive = true; // reactivate rotated key just in case

  await keyDoc.save();

  return {
    rawKey,
    keyDoc,
  };
};
