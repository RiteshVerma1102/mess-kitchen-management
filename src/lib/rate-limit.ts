import { getRedis } from './redis';
import { getEnv } from '@/config/env';
import { logger } from './logger';
import { RateLimitError } from './errors';

const REDIS_TIMEOUT_MS = 250;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('redis timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

// Fixed-window limiter. Fails OPEN if Redis is down or slow (availability over
// strictness) and logs a warning so the outage is visible. The timeout matters:
// without it a Redis outage would hang every request.
export async function enforceRateLimit(key: string, limit = getEnv().RATE_LIMIT_PER_MINUTE, windowSec = 60): Promise<void> {
  try {
    const redis = getRedis();
    const bucket = `rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
    const count = await withTimeout(redis.incr(bucket), REDIS_TIMEOUT_MS);
    if (count === 1) void redis.expire(bucket, windowSec).catch(() => undefined);
    if (count > limit) throw new RateLimitError();
  } catch (e) {
    if (e instanceof RateLimitError) throw e;
    logger.warn({ err: (e as Error).message }, 'rate limiter unavailable, failing open');
  }
}
