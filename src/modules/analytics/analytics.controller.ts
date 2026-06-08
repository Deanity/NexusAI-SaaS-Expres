import { Request, Response } from 'express';
import * as analyticsService from './analytics.service';
import { sendSuccess } from '@/shared/utils/response';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { AppError } from '@/shared/errors/AppError';

export const getOverview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const from = req.query.from as unknown as Date;
  const to = req.query.to as unknown as Date;

  const data = await analyticsService.getOverview(userId, from, to);
  sendSuccess(res, 200, 'Overview analytics retrieved successfully', data);
});

export const getDaily = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const from = req.query.from as unknown as Date;
  const to = req.query.to as unknown as Date;

  const data = await analyticsService.getDailyBreakdown(userId, from, to);
  sendSuccess(res, 200, 'Daily analytics breakdown retrieved successfully', data);
});

export const getModels = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const from = req.query.from as unknown as Date;
  const to = req.query.to as unknown as Date;

  const data = await analyticsService.getModelBreakdown(userId, from, to);
  sendSuccess(res, 200, 'Model analytics breakdown retrieved successfully', data);
});

export const getApiKeys = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const from = req.query.from as unknown as Date;
  const to = req.query.to as unknown as Date;

  const data = await analyticsService.getApiKeyBreakdown(userId, from, to);
  sendSuccess(res, 200, 'API Key analytics breakdown retrieved successfully', data);
});
