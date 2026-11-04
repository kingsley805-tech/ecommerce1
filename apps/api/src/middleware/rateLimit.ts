import type { NextFunction, Request, Response } from 'express';
import { redis } from '../lib/redis';
import { ApiError } from '../lib/errors';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
}

/** Redis sliding-window rate limiter. */
export function rateLimit(opts: RateLimitOptions) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const key = `${opts.keyPrefix}:${req.ip ?? 'unknown'}:${req.method}:${req.originalUrl}`;
    const windowKey = `${key}:${Math.floor(Date.now() / opts.windowMs)}`;
    try {
      const count = await redis.incr(windowKey);
      if (count === 1) {
        await redis.pexpire(windowKey, opts.windowMs);
      }
      if (count > opts.max) {
        return next(
          new ApiError(
            429,
            'RATE_LIMITED',
            opts.message ?? 'Too many requests, please try again later.',
          ),
        );
      }
      next();
    } catch {
      next(); // fail open if Redis unavailable
    }
  };
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  keyPrefix: 'rl:auth',
});

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  keyPrefix: 'rl:global',
});
