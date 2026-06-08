import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyAccessToken } from '@/shared/utils/token';
import { AppError } from '@/shared/errors/AppError';
import { findUserById } from '@/modules/user/user.repository';
import { asyncHandler } from '@/shared/utils/asyncHandler';
import { authenticateApiKey } from './authenticateApiKey';

export const authenticate: RequestHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Delegate to API Key auth if x-api-key header is present
    if (req.headers['x-api-key']) {
      return authenticateApiKey(req, res, next);
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token is missing or invalid', 401, 'TOKEN_INVALID');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = verifyAccessToken(token);

      // Fetch user from DB to check status
      const user = await findUserById(payload.sub);
      if (!user) {
        throw new AppError('User not found', 401, 'TOKEN_INVALID');
      }

      if (!user.isActive) {
        throw new AppError('User account is deactivated', 403, 'FORBIDDEN');
      }

      req.user = payload;
      req.authMethod = 'jwt';
      next();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Access token is expired or invalid', 401, 'TOKEN_INVALID');
    }
  }
);
