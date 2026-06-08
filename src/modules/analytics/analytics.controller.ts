import { Request, Response } from 'express';
import crypto from 'crypto';
import * as analyticsService from './analytics.service';
import { sendSuccess } from '@/shared/utils/response';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { AppError } from '@/shared/errors/AppError';
import { redis } from '@/config/redis';

const setCacheHeader = async (
  res: Response,
  userId: string,
  type: string,
  from: unknown,
  to: unknown
): Promise<void> => {
  const fromDate = new Date(from as string | number | Date);
  const toDate = new Date(to as string | number | Date);
  const rangeHash = crypto
    .createHash('md5')
    .update(`${fromDate.toISOString()}-${toDate.toISOString()}-${type}`)
    .digest('hex');
  const cacheKey = `analytics:${userId}:${rangeHash}`;
  const cached = await redis.get(cacheKey);
  res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
};

export const getOverview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const from = req.query.from;
  const to = req.query.to;

  await setCacheHeader(res, userId, 'overview', from, to);

  const data = await analyticsService.getOverview(
    userId,
    from as unknown as Date,
    to as unknown as Date
  );
  sendSuccess(res, 200, 'Overview analytics retrieved successfully', data);
});

export const getDaily = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const from = req.query.from;
  const to = req.query.to;

  await setCacheHeader(res, userId, 'daily', from, to);

  const data = await analyticsService.getDailyBreakdown(
    userId,
    from as unknown as Date,
    to as unknown as Date
  );
  sendSuccess(res, 200, 'Daily analytics breakdown retrieved successfully', data);
});

export const getModels = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const from = req.query.from;
  const to = req.query.to;

  await setCacheHeader(res, userId, 'models', from, to);

  const data = await analyticsService.getModelBreakdown(
    userId,
    from as unknown as Date,
    to as unknown as Date
  );
  sendSuccess(res, 200, 'Model analytics breakdown retrieved successfully', data);
});

export const getApiKeys = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const from = req.query.from;
  const to = req.query.to;

  await setCacheHeader(res, userId, 'api-keys', from, to);

  const data = await analyticsService.getApiKeyBreakdown(
    userId,
    from as unknown as Date,
    to as unknown as Date
  );
  sendSuccess(res, 200, 'API Key analytics breakdown retrieved successfully', data);
});
