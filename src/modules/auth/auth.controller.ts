import { Request, Response } from 'express';
import * as authService from '@/modules/auth/auth.service';
import { sendSuccess } from '@/shared/utils/response';
import { env } from '@/config/env';
import { AppError } from '@/shared/errors/AppError';
import { getCookie } from '@/shared/utils/cookie';
import { asyncHandler } from '@/shared/utils/asyncHandler';

// Helper to set cookie
const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;
  const user = await authService.register(name, email, password);
  sendSuccess(
    res,
    201,
    'Registration successful. Please check your email to verify your account.',
    {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
    }
  );
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

  const result = await authService.login(email, password, userAgent, ipAddress);

  setRefreshTokenCookie(res, result.refreshToken);

  sendSuccess(res, 200, 'Login successful', {
    user: result.user,
    accessToken: result.accessToken,
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const token = getCookie(req, 'refreshToken') || req.body?.refreshToken;
  if (!token) {
    throw new AppError('Refresh token is missing', 401, 'TOKEN_INVALID');
  }

  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

  const result = await authService.refresh(token, userAgent, ipAddress);

  setRefreshTokenCookie(res, result.refreshToken);

  sendSuccess(res, 200, 'Token refreshed successfully', {
    accessToken: result.accessToken,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const token = getCookie(req, 'refreshToken') || req.body?.refreshToken;
  if (token && req.user) {
    await authService.logout(req.user.sub, token);
  }

  res.clearCookie('refreshToken');
  sendSuccess(res, 200, 'Logout successful');
});

export const logoutAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  if (req.user) {
    await authService.logoutAll(req.user.sub);
  }

  res.clearCookie('refreshToken');
  sendSuccess(res, 200, 'Logged out from all devices successfully');
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;
  const user = await authService.verifyEmail(token);
  sendSuccess(res, 200, 'Email verified successfully', {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      credits: user.credits,
    },
  });
});

export const resendVerification = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    await authService.resendVerification(email);
    sendSuccess(res, 200, 'Verification email resent successfully');
  }
);

export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  await authService.forgotPassword(email);
  sendSuccess(res, 200, 'If the email exists, a password reset link has been sent.');
});

export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  sendSuccess(res, 200, 'Password has been reset successfully.');
});
