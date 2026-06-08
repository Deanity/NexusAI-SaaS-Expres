import crypto from 'crypto';
import mongoose from 'mongoose';
import { env } from '@/config/env';
import { redis } from '@/config/redis';
import { AppError } from '@/shared/errors/AppError';
import { UserDocument } from '@/modules/user/user.model';
import { EmailVerification } from '@/modules/auth/emailVerification.model';
import * as authRepository from '@/modules/auth/auth.repository';
import * as userRepository from '@/modules/user/user.repository';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/shared/utils/token';
import { emailQueue } from '@/config/queue';

const LOCKOUT_ATTEMPTS = 10;
const LOCKOUT_TIME_SECONDS = 1800; // 30 minutes

interface LoginResult {
  user: UserDocument;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

// Helper to check and increment failed login attempts
const handleFailedLoginAttempt = async (email: string): Promise<void> => {
  const key = `login_attempts:${email.toLowerCase()}`;
  const attemptsStr = await redis.get(key);
  const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

  if (attempts === 0) {
    await redis.set(key, '1', 'EX', LOCKOUT_TIME_SECONDS);
  } else {
    await redis.incr(key);
  }
};

// Helper to clear failed login attempts
const clearFailedLoginAttempts = async (email: string): Promise<void> => {
  const key = `login_attempts:${email.toLowerCase()}`;
  await redis.del(key);
};

export const register = async (
  name: string,
  email: string,
  password: string
): Promise<UserDocument> => {
  // Check if user already exists
  const existingUser = await userRepository.findUserByEmail(email);
  if (existingUser) {
    throw new AppError('Email is already registered', 409, 'DUPLICATE_EMAIL');
  }

  // Create user with default 0 credits and unverified status
  const user = await userRepository.createUser({
    name,
    email,
    password,
    isEmailVerified: false,
    isActive: true,
    credits: 0,
    subscriptionId: null,
  });

  // Auto-subscribe user to Free Plan
  const { Plan } = await import('@/modules/subscription/plan.model');
  const { Subscription, SubscriptionStatus } =
    await import('@/modules/subscription/subscription.model');

  const freePlan = await Plan.findOne({ slug: 'free' });
  if (freePlan) {
    const subscription = await Subscription.create({
      userId: user._id,
      planId: freePlan._id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    });

    user.subscriptionId = subscription._id as mongoose.Types.ObjectId;
    user.credits = freePlan.creditsPerCycle;
    await user.save();

    // Record welcome subscription grant in CreditLedger
    const { CreditLedger, CreditAction } = await import('@/modules/credit/creditLedger.model');
    await CreditLedger.create({
      userId: user._id,
      action: CreditAction.SUBSCRIPTION,
      amount: freePlan.creditsPerCycle,
      balanceAfter: user.credits,
      description: `Free subscription credits grant on registration`,
      referenceId: subscription._id,
      referenceModel: 'Subscription',
    });
  }

  // Generate random 64-char hex token for email verification
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Save token in DB
  await EmailVerification.create({
    userId: user._id,
    token: verificationToken,
    type: 'email_verify',
    expiresAt,
  });

  // Queue verification email job
  await emailQueue.add('send-verification', {
    email: user.email,
    name: user.name,
    token: verificationToken,
  });

  return user;
};

export const login = async (
  email: string,
  password: string,
  userAgent: string,
  ipAddress: string
): Promise<LoginResult> => {
  const lowercaseEmail = email.toLowerCase();
  const lockoutKey = `login_attempts:${lowercaseEmail}`;

  // Check if account is locked
  const attemptsStr = (await lockoutKey) ? await redis.get(lockoutKey) : null;
  const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

  if (attempts >= LOCKOUT_ATTEMPTS) {
    const ttl = await redis.ttl(lockoutKey);
    throw new AppError(
      `Account is locked due to too many failed login attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`,
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }

  // Find user by email (explicitly selecting password)
  const user = await userRepository.findUserByEmailWithPassword(lowercaseEmail);
  if (!user) {
    await handleFailedLoginAttempt(lowercaseEmail);
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Check if user is active (soft ban check)
  if (!user.isActive) {
    throw new AppError(
      'Your account has been deactivated. Please contact support.',
      403,
      'FORBIDDEN'
    );
  }

  // Compare passwords
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await handleFailedLoginAttempt(lowercaseEmail);
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Clear lockout attempt on success
  await clearFailedLoginAttempts(lowercaseEmail);

  // Update last login timestamp
  user.lastLoginAt = new Date();
  await user.save();

  // Generate tokens
  const accessToken = signAccessToken(user._id.toString(), user.role);
  const refreshToken = signRefreshToken(user._id.toString(), user.role);
  const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Save refresh token to DB/Redis
  await authRepository.saveRefreshToken(
    user._id.toString(),
    refreshToken,
    userAgent,
    ipAddress,
    refreshTokenExpiry
  );

  // User object returned should not contain password
  const userObj = user.toObject();
  delete userObj.password;

  return {
    user: userObj as UserDocument,
    accessToken,
    refreshToken,
    expiresIn: env.JWT_ACCESS_EXPIRY,
  };
};

export const refresh = async (
  token: string,
  userAgent: string,
  ipAddress: string
): Promise<RefreshResult> => {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401, 'TOKEN_INVALID');
  }

  const userId = payload.sub;

  // Verify token exists in database and Redis
  const activeToken = await authRepository.findRefreshToken(userId, token);
  if (!activeToken) {
    throw new AppError('Refresh token is invalid or has been revoked', 401, 'TOKEN_INVALID');
  }

  // Revoke old refresh token (Rotate token)
  await authRepository.revokeRefreshToken(userId, token);

  // Find user to check status and role
  const user = await userRepository.findUserById(userId);
  if (!user || !user.isActive) {
    throw new AppError('User is inactive or not found', 403, 'FORBIDDEN');
  }

  // Generate new token pair
  const newAccessToken = signAccessToken(user._id.toString(), user.role);
  const newRefreshToken = signRefreshToken(user._id.toString(), user.role);
  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Save new refresh token
  await authRepository.saveRefreshToken(
    user._id.toString(),
    newRefreshToken,
    userAgent,
    ipAddress,
    newExpiry
  );

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: env.JWT_ACCESS_EXPIRY,
  };
};

export const logout = async (userId: string, refreshToken: string): Promise<void> => {
  await authRepository.revokeRefreshToken(userId, refreshToken);
};

export const logoutAll = async (userId: string): Promise<void> => {
  await authRepository.revokeAllUserTokens(userId);
};

export const verifyEmail = async (token: string): Promise<UserDocument> => {
  // Find token
  const verification = await EmailVerification.findOne({ token, type: 'email_verify' });
  if (!verification || verification.usedAt) {
    throw new AppError('Invalid or expired email verification token', 400, 'VALIDATION_ERROR');
  }

  // Check expiration
  if (verification.expiresAt < new Date()) {
    throw new AppError('Email verification token has expired', 400, 'TOKEN_EXPIRED');
  }

  // Mark token as used
  verification.usedAt = new Date();
  await verification.save();

  // Find user
  const user = await userRepository.findUserById(verification.userId.toString());
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  // If already verified, do not re-verify
  if (user.isEmailVerified) {
    return user;
  }

  // Verify user
  user.isEmailVerified = true;
  await user.save();

  // Grant credits using CreditService
  const { addCredits } = await import('@/modules/credit/credit.service');
  const { CreditAction } = await import('@/modules/credit/creditLedger.model');

  await addCredits(
    user._id.toString(),
    env.WELCOME_BONUS_CREDITS,
    CreditAction.WELCOME_BONUS,
    null,
    null,
    'Welcome bonus for email verification'
  );

  // Queue welcome email job
  await emailQueue.add('send-welcome', {
    email: user.email,
    name: user.name,
  });

  return user;
};

export const resendVerification = async (email: string): Promise<void> => {
  const lowercaseEmail = email.toLowerCase();
  const user = await userRepository.findUserByEmail(lowercaseEmail);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (user.isEmailVerified) {
    throw new AppError('Email is already verified', 400, 'VALIDATION_ERROR');
  }

  // Rate limit resend requests in Redis: 3 requests per hour
  const limitKey = `rate_limit_resend:${lowercaseEmail}`;
  const resendCountStr = await redis.get(limitKey);
  const resendCount = resendCountStr ? parseInt(resendCountStr, 10) : 0;

  if (resendCount >= 3) {
    const ttl = await redis.ttl(limitKey);
    throw new AppError(
      `Too many verification requests. Please try again in ${Math.ceil(ttl / 60)} minutes.`,
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }

  if (resendCount === 0) {
    await redis.set(limitKey, '1', 'EX', 3600); // 1 hour TTL
  } else {
    await redis.incr(limitKey);
  }

  // Invalidate any existing unused verify tokens
  await EmailVerification.updateMany(
    { userId: user._id, type: 'email_verify', usedAt: null },
    { $set: { expiresAt: new Date() } } // Expire immediately
  );

  // Generate new token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await EmailVerification.create({
    userId: user._id,
    token: verificationToken,
    type: 'email_verify',
    expiresAt,
  });

  // Queue resend verification email job
  await emailQueue.add('send-verification', {
    email: user.email,
    name: user.name,
    token: verificationToken,
  });
};

export const forgotPassword = async (email: string): Promise<void> => {
  const lowercaseEmail = email.toLowerCase();
  const user = await userRepository.findUserByEmail(lowercaseEmail);

  // Fail silently or pretend success to prevent user enumeration
  if (!user) {
    console.log(`✉ [STUB EMAIL] Forgot password request for non-existent user: ${lowercaseEmail}`);
    return;
  }

  // Invalidate previous reset tokens
  await EmailVerification.updateMany(
    { userId: user._id, type: 'password_reset', usedAt: null },
    { $set: { expiresAt: new Date() } }
  );

  // Generate password reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

  await EmailVerification.create({
    userId: user._id,
    token: resetToken,
    type: 'password_reset',
    expiresAt,
  });

  // Queue password reset email job
  await emailQueue.add('send-password-reset', {
    email: user.email,
    token: resetToken,
  });
};

export const resetPassword = async (token: string, passwordRules: string): Promise<void> => {
  const resetTokenDoc = await EmailVerification.findOne({ token, type: 'password_reset' });
  if (!resetTokenDoc || resetTokenDoc.usedAt) {
    throw new AppError('Invalid or expired password reset token', 400, 'VALIDATION_ERROR');
  }

  if (resetTokenDoc.expiresAt < new Date()) {
    throw new AppError('Password reset token has expired', 400, 'TOKEN_EXPIRED');
  }

  // Find user
  const user = await userRepository.findUserById(resetTokenDoc.userId.toString());
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  // Set new password (pre-save hook hashes it)
  user.password = passwordRules;
  await user.save();

  // Mark token as used
  resetTokenDoc.usedAt = new Date();
  await resetTokenDoc.save();

  // Revoke all refresh tokens for security on password change
  await authRepository.revokeAllUserTokens(user._id.toString());

  console.log(`✔ [AUTH] Password reset successful for user: ${user.email}`);
};
