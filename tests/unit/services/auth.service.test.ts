import { User } from '@/modules/user/user.model';
import { EmailVerification } from '@/modules/auth/emailVerification.model';
import * as authService from '@/modules/auth/auth.service';
import { createTestUser } from '../../helpers/factories';
import { AppError } from '@/shared/errors/AppError';

describe('Auth Service Unit Tests', () => {
  it('should successfully register a new user and create verification token', async () => {
    const email = 'register-test@example.com';
    const password = 'Password123';
    const name = 'Register Test User';

    const user = await authService.register(name, email, password);

    expect(user).toBeTruthy();
    expect(user.email).toBe(email);
    expect(user.name).toBe(name);
    expect(user.isEmailVerified).toBe(false);
    expect(user.credits).toBe(0);

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
    expect(verifiedUser.credits).toBe(100); // WELCOME_BONUS_CREDITS
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
});
