import { User } from '@/modules/user/user.model';
import { EmailVerification } from '@/modules/auth/emailVerification.model';
import * as authService from '@/modules/auth/auth.service';
import { createTestUser, createTestPlan } from '../../helpers/factories';
import { AppError } from '@/shared/errors/AppError';
import { redis } from '@/config/redis';
import mongoose from 'mongoose';
import { signRefreshToken } from '@/shared/utils/token';

async function expectAppError(promise: Promise<any>, statusCode: number, errorCode: string) {
  try {
    await promise;
    throw new Error('Expected promise to reject with AppError');
  } catch (err: any) {
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(statusCode);
    expect(err.code).toBe(errorCode);
  }
}

describe('Auth Service Unit Tests', () => {
  beforeEach(async () => {
    // Seed the free plan for auto-subscription on register
    await createTestPlan({ slug: 'free', name: 'Free Plan', price: 0, creditsPerCycle: 100 });
  });

  it('should successfully register a new user, subscribe them to free plan, and create verification token', async () => {
    const email = 'register-test@example.com';
    const password = 'Password123';
    const name = 'Register Test User';

    const user = await authService.register(name, email, password);

    expect(user).toBeTruthy();
    expect(user.email).toBe(email);
    expect(user.name).toBe(name);
    expect(user.isEmailVerified).toBe(false);
    expect(user.credits).toBe(100); // from free plan
    expect(user.subscriptionId).toBeTruthy();

    const verification = await EmailVerification.findOne({
      userId: user._id,
      type: 'email_verify',
    });
    expect(verification).toBeTruthy();
    expect(verification?.token).toBeTruthy();
  });

  it('should throw error when registering an already existing email', async () => {
    const email = 'existing-user@example.com';
    await createTestUser({ email });

    await expect(authService.register('Test', email, 'Password123')).rejects.toThrow(AppError);
  });

  it('should login successfully with correct credentials', async () => {
    const email = 'login-test@example.com';
    const password = 'Password123';
    await authService.register('Login User', email, password);

    // Verify email first to login
    const user = await User.findOne({ email });
    user!.isEmailVerified = true;
    await user!.save();

    const res = await authService.login(email, password, 'Jest Agent', '127.0.0.1');
    expect(res.accessToken).toBeTruthy();
    expect(res.refreshToken).toBeTruthy();
    expect(res.user.email).toBe(email);
  });

  it('should throw 401 on login with wrong password', async () => {
    const email = 'login-fail@example.com';
    const password = 'CorrectPassword123';
    await authService.register('Login User', email, password);

    await expect(
      authService.login(email, 'WrongPassword', 'Jest Agent', '127.0.0.1')
    ).rejects.toThrow(AppError);
  });

  it('should throw 429 when logging in while locked out', async () => {
    const email = 'locked-user@example.com';
    const lockoutKey = `login_attempts:${email}`;
    await redis.set(lockoutKey, '10', 'EX', 1800);

    await expectAppError(
      authService.login(email, 'SomePassword', 'Jest Agent', '127.0.0.1'),
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  });

  it('should throw 401 when logging in with non-existent email', async () => {
    await expectAppError(
      authService.login('doesnotexist@example.com', 'Password123', 'Jest Agent', '127.0.0.1'),
      401,
      'INVALID_CREDENTIALS'
    );
  });

  it('should throw 403 when logging in with deactivated user', async () => {
    const email = 'deactivated@example.com';
    await createTestUser({ email, isActive: false, isEmailVerified: true });

    await expectAppError(
      authService.login(email, 'Password123', 'Jest Agent', '127.0.0.1'),
      403,
      'FORBIDDEN'
    );
  });

  it('should rotate refresh tokens on token refresh', async () => {
    const email = 'refresh-test@example.com';
    const password = 'Password123';
    await authService.register('Refresh User', email, password);

    const user = await User.findOne({ email });
    user!.isEmailVerified = true;
    await user!.save();

    const loginRes = await authService.login(email, password, 'Jest Agent', '127.0.0.1');
    const refreshRes = await authService.refresh(loginRes.refreshToken, 'Jest Agent', '127.0.0.1');

    expect(refreshRes.accessToken).toBeTruthy();
    expect(refreshRes.refreshToken).toBeTruthy();
    expect(refreshRes.refreshToken).not.toBe(loginRes.refreshToken);
  });

  it('should throw 401 on refresh with invalid signature token', async () => {
    await expectAppError(
      authService.refresh('invalid-token', 'Jest Agent', '127.0.0.1'),
      401,
      'TOKEN_INVALID'
    );
  });

  it('should throw 401 on refresh with non-existent or revoked token', async () => {
    const user = await createTestUser();
    const token = signRefreshToken(user._id.toString(), user.role);

    await expectAppError(
      authService.refresh(token, 'Jest Agent', '127.0.0.1'),
      401,
      'TOKEN_INVALID'
    );
  });

  it('should throw 403 on refresh with deactivated user', async () => {
    const user = await createTestUser({ isActive: false });
    const token = signRefreshToken(user._id.toString(), user.role);
    
    // Save to Redis and DB as if it was active
    const authRepository = await import('@/modules/auth/auth.repository');
    await authRepository.saveRefreshToken(user._id.toString(), token, 'Jest Agent', '127.0.0.1', new Date(Date.now() + 100000));

    await expectAppError(
      authService.refresh(token, 'Jest Agent', '127.0.0.1'),
      403,
      'FORBIDDEN'
    );
  });

  it('should revoke token on logout', async () => {
    const email = 'logout-test@example.com';
    const password = 'Password123';
    await authService.register('Logout User', email, password);

    const user = await User.findOne({ email });
    user!.isEmailVerified = true;
    await user!.save();

    const loginRes = await authService.login(email, password, 'Jest Agent', '127.0.0.1');
    await authService.logout(user!._id.toString(), loginRes.refreshToken);

    await expect(
      authService.refresh(loginRes.refreshToken, 'Jest Agent', '127.0.0.1')
    ).rejects.toThrow(AppError);
  });

  it('should revoke all tokens on logoutAll', async () => {
    const email = 'logoutall-test@example.com';
    const password = 'Password123';
    await authService.register('LogoutAll User', email, password);

    const user = await User.findOne({ email });
    user!.isEmailVerified = true;
    await user!.save();

    const loginRes = await authService.login(email, password, 'Jest Agent', '127.0.0.1');
    await authService.logoutAll(user!._id.toString());

    await expect(
      authService.refresh(loginRes.refreshToken, 'Jest Agent', '127.0.0.1')
    ).rejects.toThrow(AppError);
  });

  it('should verify email and grant welcome credits', async () => {
    const email = 'verify-test@example.com';
    const password = 'Password123';
    const user = await authService.register('Verify User', email, password);

    const verification = await EmailVerification.findOne({
      userId: user._id,
      type: 'email_verify',
    });
    expect(verification).toBeTruthy();

    const verifiedUser = await authService.verifyEmail(verification!.token);
    expect(verifiedUser.isEmailVerified).toBe(true);
    expect(verifiedUser.credits).toBe(200); // 100 registration + 100 welcome
  });

  it('should throw 400 on verifyEmail with invalid token', async () => {
    await expectAppError(
      authService.verifyEmail('nonexistenttoken'),
      400,
      'VALIDATION_ERROR'
    );
  });

  it('should throw 400 on verifyEmail with expired token', async () => {
    const user = await createTestUser({ isEmailVerified: false });
    const verification = await EmailVerification.create({
      userId: user._id,
      token: 'expiredtoken',
      type: 'email_verify',
      expiresAt: new Date(Date.now() - 1000),
    });

    await expectAppError(
      authService.verifyEmail(verification.token),
      400,
      'TOKEN_EXPIRED'
    );
  });

  it('should throw 404 on verifyEmail if user no longer exists', async () => {
    const verification = await EmailVerification.create({
      userId: new mongoose.Types.ObjectId(),
      token: 'nousertoken',
      type: 'email_verify',
      expiresAt: new Date(Date.now() + 100000),
    });

    await expectAppError(
      authService.verifyEmail(verification.token),
      404,
      'NOT_FOUND'
    );
  });

  it('should return user directly on verifyEmail if already verified', async () => {
    const user = await createTestUser({ isEmailVerified: true });
    const verification = await EmailVerification.create({
      userId: user._id,
      token: 'alreadyverified',
      type: 'email_verify',
      expiresAt: new Date(Date.now() + 100000),
    });

    const result = await authService.verifyEmail(verification.token);
    expect(result._id.toString()).toBe(user._id.toString());
  });

  it('should resend verification successfully', async () => {
    const user = await createTestUser({ isEmailVerified: false });
    await authService.resendVerification(user.email);

    const verification = await EmailVerification.findOne({ userId: user._id, type: 'email_verify', usedAt: null });
    expect(verification).toBeTruthy();
  });

  it('should throw 404 on resendVerification for non-existent email', async () => {
    await expectAppError(
      authService.resendVerification('doesnotexist@example.com'),
      404,
      'NOT_FOUND'
    );
  });

  it('should throw 400 on resendVerification for already verified user', async () => {
    const user = await createTestUser({ isEmailVerified: true });
    await expectAppError(
      authService.resendVerification(user.email),
      400,
      'VALIDATION_ERROR'
    );
  });

  it('should throw 429 on resendVerification when rate limit exceeded', async () => {
    const user = await createTestUser({ isEmailVerified: false });
    const limitKey = `rate_limit_resend:${user.email.toLowerCase()}`;
    await redis.set(limitKey, '3');

    await expectAppError(
      authService.resendVerification(user.email),
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  });

  it('should support forgot password and reset password flow', async () => {
    const email = 'reset-test@example.com';
    const password = 'OldPassword123';
    const user = await authService.register('Reset User', email, password);
    user.isEmailVerified = true;
    await user.save();

    await authService.forgotPassword(email);

    const resetDoc = await EmailVerification.findOne({ userId: user._id, type: 'password_reset' });
    expect(resetDoc).toBeTruthy();

    const updatedUser = await authService.resetPassword(resetDoc!.token, 'NewPassword123');
    expect(updatedUser).toBeTruthy();

    // Verify login with new password
    const loginRes = await authService.login(email, 'NewPassword123', 'Jest Agent', '127.0.0.1');
    expect(loginRes.accessToken).toBeTruthy();
  });

  it('should silently handle forgotPassword for non-existent email', async () => {
    await expect(authService.forgotPassword('nonexistent@example.com')).resolves.not.toThrow();
  });

  it('should throw 400 on resetPassword with invalid token', async () => {
    await expectAppError(
      authService.resetPassword('invalidtoken', 'NewPassword123'),
      400,
      'VALIDATION_ERROR'
    );
  });

  it('should throw 400 on resetPassword with expired token', async () => {
    const user = await createTestUser();
    const resetDoc = await EmailVerification.create({
      userId: user._id,
      token: 'expiredresettoken',
      type: 'password_reset',
      expiresAt: new Date(Date.now() - 1000),
    });

    await expectAppError(
      authService.resetPassword(resetDoc.token, 'NewPassword123'),
      400,
      'TOKEN_EXPIRED'
    );
  });

  it('should throw 404 on resetPassword if user no longer exists', async () => {
    const resetDoc = await EmailVerification.create({
      userId: new mongoose.Types.ObjectId(),
      token: 'nouserresettoken',
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 100000),
    });

    await expectAppError(
      authService.resetPassword(resetDoc.token, 'NewPassword123'),
      404,
      'NOT_FOUND'
    );
  });
});
