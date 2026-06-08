import { Request, Response, NextFunction } from 'express';
import { redis } from '@/config/redis';
import { ApiKey, ApiKeyDocument } from '@/modules/apikey/apiKey.model';
import { hashSHA256 } from '@/shared/utils/hash';
import { AppError } from '@/shared/errors/AppError';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { apiKeyQueue } from '@/config/queue';

export const authenticateApiKey = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const rawKey = req.headers['x-api-key'];

    if (!rawKey || typeof rawKey !== 'string') {
      throw new AppError('API Key is missing or invalid', 401, 'API_KEY_MISSING');
    }

    const keyHash = hashSHA256(rawKey);
    const cacheKey = `apikey:${keyHash}`;

    let apiKeyDoc: ApiKeyDocument | null = null;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      apiKeyDoc = JSON.parse(cachedData);
    } else {
      const dbKeyDoc = await ApiKey.findOne({ keyHash });
      if (dbKeyDoc) {
        apiKeyDoc = dbKeyDoc.toObject();
        // Cache for 5 minutes
        await redis.set(cacheKey, JSON.stringify(apiKeyDoc), 'EX', 300);
      }
    }

    if (!apiKeyDoc) {
      throw new AppError('Invalid API Key', 401, 'API_KEY_INVALID');
    }

    if (!apiKeyDoc.isActive) {
      throw new AppError('API Key has been revoked', 401, 'API_KEY_REVOKED');
    }

    if (apiKeyDoc.expiresAt && new Date(apiKeyDoc.expiresAt) < new Date()) {
      throw new AppError('API Key has expired', 401, 'API_KEY_EXPIRED');
    }

    // IP Whitelist check
    if (apiKeyDoc.ipWhitelist && apiKeyDoc.ipWhitelist.length > 0) {
      const clientIp = req.ip || req.socket.remoteAddress || '';
      const cleanClientIp = clientIp.startsWith('::ffff:') ? clientIp.substring(7) : clientIp;
      const normalizedClientIp = cleanClientIp === '::1' ? '127.0.0.1' : cleanClientIp;

      const isAllowed = apiKeyDoc.ipWhitelist.some((ip: string) => {
        return ip === normalizedClientIp || normalizedClientIp.endsWith(ip);
      });

      if (!isAllowed) {
        throw new AppError('IP address not whitelisted', 403, 'API_KEY_IP_NOT_ALLOWED');
      }
    }

    // Attach credentials to request context
    req.user = {
      sub: apiKeyDoc.userId.toString(),
      role: 'user', // API key requests act as users
    };
    req.authMethod = 'apikey';
    req.apiKeyId = apiKeyDoc._id.toString();
    req.apiKeyScopes = apiKeyDoc.scopes;

    // Queue async usage statistics update
    apiKeyQueue.add('update-usage', { apiKeyId: apiKeyDoc._id.toString() }).catch((err) => {
      console.error('Failed to queue API key usage update:', err);
    });

    next();
  }
);
