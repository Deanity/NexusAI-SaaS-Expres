import { Request, Response, NextFunction, RequestHandler } from 'express';
import { redis } from '@/config/redis';
import { sendError } from '@/shared/utils/response';

interface RateLimiterOptions {
  windowMs: number;
  max: number | ((req: Request) => number | Promise<number>);
  keyPrefix: string;
}

const LUA_SLIDING_WINDOW = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local clearBefore = now - window

  redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
  local count = redis.call('ZCARD', key)

  if count < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, math.ceil(window / 1000))
    return {1, limit - count - 1, math.ceil((now + window) / 1000)}
  else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local oldestTime = tonumber(oldest[2] or now)
    local retryAfter = math.ceil((oldestTime + window - now) / 1000)
    -- Handle edge case where retryAfter is <= 0 but limit is still hit
    if retryAfter <= 0 then
      retryAfter = 1
    end
    return {0, retryAfter, math.ceil((oldestTime + window) / 1000)}
  end
`;

export const createRateLimiter = (options: RateLimiterOptions): RequestHandler => {
  const { windowMs, max, keyPrefix } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.user?.sub || req.ip || req.socket.remoteAddress || 'unknown';
      const key = `rate_limit:${id}:${keyPrefix}`;

      // Resolve dynamic limit if it's a function
      const maxLimit = typeof max === 'function' ? await max(req) : max;

      const now = Date.now();

      // Execute Lua script
      const result = (await redis.eval(LUA_SLIDING_WINDOW, 1, key, now, windowMs, maxLimit)) as [
        number,
        number,
        number,
      ];

      const [allowed, remainingOrRetryAfter, resetEpoch] = result;

      if (allowed === 1) {
        // Set standard rate limiting headers
        res.setHeader('X-RateLimit-Limit', maxLimit);
        res.setHeader('X-RateLimit-Remaining', remainingOrRetryAfter);
        res.setHeader('X-RateLimit-Reset', resetEpoch);
        next();
      } else {
        // Set headers for rate limit exceeded
        res.setHeader('X-RateLimit-Limit', maxLimit);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', resetEpoch);
        res.setHeader('Retry-After', remainingOrRetryAfter);

        sendError(
          res,
          429,
          `Rate limit exceeded. Try again in ${remainingOrRetryAfter}s.`,
          'RATE_LIMIT_EXCEEDED'
        );
      }
    } catch (error) {
      // Log error but let the request pass in case Redis is down to avoid blocking users
      console.error('[RATE_LIMITER] Error executing rate limiter:', error);
      next();
    }
  };
};
