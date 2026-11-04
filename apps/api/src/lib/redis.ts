import Redis from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

export async function connectRedis() {
  if (redis.status === 'wait' || redis.status === 'end') {
    await redis.connect();
  }
  return redis;
}

export async function disconnectRedis() {
  if (redis.status === 'ready') {
    await redis.quit();
  }
}

/** Redis-based mutex guard for idempotency and stock operations. */
export async function withLock<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, '1', 'EX', Math.ceil(ttlMs / 1000), 'NX');
  if (!acquired) {
    throw new ApiError(409, 'CONCURRENCY', 'Another operation is in progress, please retry.');
  }
  try {
    return await fn();
  } finally {
    await redis.del(lockKey);
  }
}

import { ApiError } from './errors';
