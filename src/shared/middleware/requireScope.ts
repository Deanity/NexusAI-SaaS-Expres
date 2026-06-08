import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ApiKeyScope } from '@/modules/apikey/apiKey.model';
import { AppError } from '@/shared/errors/AppError';

export const requireScope = (scope: ApiKeyScope): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'TOKEN_INVALID');
    }

    // JWT/Dashboard users bypass scope checks
    if (req.authMethod === 'jwt') {
      return next();
    }

    // API Key users must have the matching scope
    if (req.authMethod === 'apikey') {
      const scopes = (req.apiKeyScopes as ApiKeyScope[]) || [];
      if (!scopes.includes(scope)) {
        throw new AppError('Insufficient API Key scope permissions', 403, 'INSUFFICIENT_SCOPE');
      }
      return next();
    }

    throw new AppError('Invalid authentication method', 401, 'TOKEN_INVALID');
  };
};
