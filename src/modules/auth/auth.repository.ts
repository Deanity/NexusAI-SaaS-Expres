import { redis } from '@/config/redis';
import { RefreshToken, RefreshTokenDocument } from '@/modules/auth/refreshToken.model';
import { hashSHA256 } from '@/shared/utils/hash';

export const saveRefreshToken = async (
  userId: string,
  token: string,
  userAgent: string,
  ipAddress: string,
  expiresAt: Date
): Promise<RefreshTokenDocument> => {
  const tokenHash = hashSHA256(token);

  // Save in DB
  const doc = await RefreshToken.create({
    userId,
    token: tokenHash,
    userAgent,
    ipAddress,
    expiresAt,
  });

  // Save in Redis
  const ttlSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  await redis.set(`refresh:${userId}:${tokenHash}`, 'true', 'EX', ttlSeconds);

  return doc;
};

export const findRefreshToken = async (
  userId: string,
  token: string
): Promise<RefreshTokenDocument | null> => {
  const tokenHash = hashSHA256(token);

  // Check Redis
  const inRedis = await redis.get(`refresh:${userId}:${tokenHash}`);
  if (!inRedis) {
    return null;
  }

  // Find in DB to ensure it is not revoked
  const doc = await RefreshToken.findOne({ userId, token: tokenHash, isRevoked: false });
  return doc;
};

export const revokeRefreshToken = async (userId: string, token: string): Promise<void> => {
  const tokenHash = hashSHA256(token);

  // Delete from Redis
  await redis.del(`refresh:${userId}:${tokenHash}`);

  // Mark as revoked in DB
  await RefreshToken.updateOne({ userId, token: tokenHash }, { isRevoked: true });
};

export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  // Revoke in DB
  await RefreshToken.updateMany({ userId }, { isRevoked: true });

  // Delete from Redis using SCAN
  let cursor = '0';
  const pattern = `refresh:${userId}:*`;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
};
