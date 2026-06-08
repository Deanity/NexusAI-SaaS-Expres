import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '@/shared/errors/AppError';

export const authorize = (allowedRoles: string[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'TOKEN_INVALID'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden: Insufficient permissions', 403, 'FORBIDDEN'));
    }

    next();
  };
};
