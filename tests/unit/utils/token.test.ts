import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '@/shared/utils/token';

describe('Token Utility Unit Tests', () => {
  it('should successfully sign and verify access token', () => {
    const userId = 'user-123';
    const role = 'admin';

    const token = signAccessToken(userId, role);
    expect(token).toBeTruthy();

    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(userId);
    expect(payload.role).toBe(role);
  });

  it('should successfully sign and verify refresh token', () => {
    const userId = 'user-456';
    const role = 'user';

    const token = signRefreshToken(userId, role);
    expect(token).toBeTruthy();

    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe(userId);
    expect(payload.role).toBe(role);
  });

  it('should throw error when verifying invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.value')).toThrow();
  });
});
