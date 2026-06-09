import request from 'supertest';
import app from '@/app';
import { User } from '@/modules/user/user.model';
import { EmailVerification } from '@/modules/auth/emailVerification.model';
import { redis } from '@/config/redis';

describe('Auth Routes Integration Tests', () => {
  it('should successfully complete the register -> verify -> login -> logout flow', async () => {
    const email = 'newuser@example.com';
    const password = 'Password123';
    const name = 'New User';

    // 1. Register
    const regRes = await request(app).post('/api/v1/auth/register').send({ email, password, name });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);

    const user = await User.findOne({ email });
    expect(user).toBeTruthy();
    expect(user?.isEmailVerified).toBe(false);

    // 2. Fetch Verification Token
    const verifyDoc = await EmailVerification.findOne({ userId: user?._id, type: 'email_verify' });
    expect(verifyDoc).toBeTruthy();

    // 3. Verify Email
    const verifyRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: verifyDoc?.token });

    expect(verifyRes.status).toBe(200);

    console.log('TEST USER ID:', user?._id);
    const allUsers = await User.find({});
    console.log('ALL USERS IN DB:', allUsers.map(u => ({ id: u._id, email: u.email, isEmailVerified: u.isEmailVerified })));

    const verifiedUser = await User.findById(user?._id);
    console.log('VERIFIED USER FETCHED:', verifiedUser);

    expect(verifiedUser?.isEmailVerified).toBe(true);
    expect(verifiedUser?.credits).toBe(100); // welcome bonus

    // 4. Login
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeTruthy();

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeTruthy();
    expect(cookies.some((c) => c.includes('refreshToken'))).toBe(true);

    const accessToken = loginRes.body.data.accessToken;

    // 5. Logout
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(logoutRes.status).toBe(200);
  });

  it('should trigger lockout after 10 failed login attempts', async () => {
    const email = 'lockout-user@example.com';
    const password = 'CorrectPassword123';
    await User.create({
      email,
      password,
      name: 'Lockout User',
      isEmailVerified: true,
    });

    // Send 10 failed attempts
    for (let i = 0; i < 10; i++) {
      const failRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email, password: 'WrongPassword' });
      expect(failRes.status).toBe(401);
    }

    // The 11th attempt (even if correct) should be locked out with 429
    const lockRes = await request(app).post('/api/v1/auth/login').send({ email, password });

    expect(lockRes.status).toBe(429);
    expect(lockRes.body.code).toBe('RATE_LIMIT_EXCEEDED');

    // Clean up login attempts in Redis
    await redis.del(`login_attempts:${email}`);
  });
});
