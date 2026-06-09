import request from 'supertest';
import app from '@/app';

describe('Rate Limiter Integration Tests', () => {
  it('should trigger rate limiting and return 429 when exceeding login endpoint limits', async () => {
    // Send 10 rapid requests to /auth/login (will fail with 400 zod validation error but consumes rate limit quota)
    for (let i = 0; i < 10; i++) {
      const res = await request(app).post('/api/v1/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.headers['x-ratelimit-limit']).toBe('10');
      expect(res.headers['x-ratelimit-remaining']).toBe(String(10 - i - 1));
    }

    // The 11th request should be rate-limited and return 429
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(res.headers['retry-after']).toBeTruthy();
  });
});
