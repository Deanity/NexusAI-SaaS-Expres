import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '@/config/env';

export interface JwtPayload {
  sub: string;
  role: string;
}

export const signAccessToken = (userId: string, role: string): string => {
  return jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'],
  });
};

export const signRefreshToken = (userId: string, role: string): string => {
  return jwt.sign({ sub: userId, role }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as SignOptions['expiresIn'],
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
};
