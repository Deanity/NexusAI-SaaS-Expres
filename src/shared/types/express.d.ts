import { JwtPayload } from '@/shared/utils/token';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      authMethod?: 'jwt' | 'apikey';
    }
  }
}
export {};
