import { Request, Response } from 'express';
import * as userRepository from '@/modules/user/user.repository';
import * as authRepository from '@/modules/auth/auth.repository';
import { sendSuccess } from '@/shared/utils/response';
import { AppError } from '@/shared/errors/AppError';
import { UserDocument } from '@/modules/user/user.model';

export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'TOKEN_INVALID');
  }

  const user = await userRepository.findUserById(req.user.sub);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  sendSuccess(res, 200, 'Profile retrieved successfully', {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      credits: user.credits,
      subscriptionId: user.subscriptionId,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'TOKEN_INVALID');
  }

  const { name } = req.body;
  const user = await userRepository.updateUser(req.user.sub, { name } as Partial<UserDocument>);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  sendSuccess(res, 200, 'Profile updated successfully', {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      credits: user.credits,
    },
  });
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'TOKEN_INVALID');
  }

  const { oldPassword, newPassword } = req.body;

  // Retrieve user with password select
  const user = await userRepository.findUserByIdWithPassword(req.user.sub);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  // Check if old password matches
  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    throw new AppError('Incorrect old password', 400, 'INVALID_CREDENTIALS');
  }

  // Update password (pre-save hook hashes it)
  user.password = newPassword;
  await user.save();

  // Revoke all refresh tokens for security on password change
  await authRepository.revokeAllUserTokens(user._id.toString());

  sendSuccess(res, 200, 'Password changed successfully. Please log in again.');
};
