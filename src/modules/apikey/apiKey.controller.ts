import { Request, Response } from 'express';
import * as apiKeyService from './apiKey.service';
import { sendSuccess } from '@/shared/utils/response';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { AppError } from '@/shared/errors/AppError';

export const createKey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const { name, scopes, ipWhitelist, expiresAt } = req.body;
  const result = await apiKeyService.createKey(userId, name, scopes, ipWhitelist, expiresAt);

  sendSuccess(
    res,
    201,
    'API Key created successfully. Please store the raw key safely as it will not be shown again.',
    {
      apiKey: result.rawKey,
      key: result.keyDoc,
    }
  );
});

export const listKeys = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const keys = await apiKeyService.listKeys(userId);

  sendSuccess(res, 200, 'API Keys retrieved successfully', keys);
});

export const updateKey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const { id } = req.params;
  const { name, scopes, ipWhitelist, expiresAt } = req.body;

  const keyDoc = await apiKeyService.updateKey(userId, id, {
    name,
    scopes,
    ipWhitelist,
    expiresAt,
  });

  sendSuccess(res, 200, 'API Key updated successfully', keyDoc);
});

export const revokeKey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const { id } = req.params;
  const keyDoc = await apiKeyService.revokeKey(userId, id);

  sendSuccess(res, 200, 'API Key revoked successfully', keyDoc);
});

export const rotateKey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.sub;
  if (!userId) {
    throw new AppError('Unauthorized', 401, 'TOKEN_INVALID');
  }

  const { id } = req.params;
  const result = await apiKeyService.rotateKey(userId, id);

  sendSuccess(
    res,
    200,
    'API Key rotated successfully. Please store the new raw key safely as it will not be shown again.',
    {
      apiKey: result.rawKey,
      key: result.keyDoc,
    }
  );
});
