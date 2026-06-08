import { Request, Response } from 'express';
import * as creditService from '@/modules/credit/credit.service';
import { sendSuccess } from '@/shared/utils/response';
import { AppError } from '@/shared/errors/AppError';
import { parsePagination } from '@/shared/utils/pagination';

export const getBalance = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'TOKEN_INVALID');
  }

  const balance = await creditService.getBalance(req.user.sub);
  sendSuccess(res, 200, 'Balance retrieved successfully', { balance });
};

export const getHistory = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'TOKEN_INVALID');
  }

  const { page, limit } = parsePagination(req);
  const result = await creditService.getHistory(req.user.sub, page, limit);

  sendSuccess(res, 200, 'Transaction history retrieved successfully', result.history, result.meta);
};
