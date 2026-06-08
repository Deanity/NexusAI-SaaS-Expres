import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '@/shared/errors/AppError';
import { findUserById } from '@/modules/user/user.repository';
import { asyncHandler } from '@/shared/utils/asyncHandler';

export const requireVerified: RequestHandler = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'TOKEN_INVALID');
    }

    const user = await findUserById(req.user.sub);
    if (!user) {
      throw new AppError('User not found', 401, 'TOKEN_INVALID');
    }

    if (!user.isEmailVerified) {
      throw new AppError('Email is not verified. Access forbidden.', 403, 'EMAIL_NOT_VERIFIED');
    }

    next();
  }
);
