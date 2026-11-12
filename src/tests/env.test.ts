import { describe, it, expect } from 'vitest';
import { parseEnv } from '@/config/env';
import { istDateKey } from '@/lib/time';
import { AppError, ValidationError, ConflictError, NotFoundError, UnauthorizedError, RateLimitError } from '@/lib/errors';

const base = {
  MONGODB_URI: 'mongodb://x/y', REDIS_URL: 'redis://x',
  JWT_ACCESS_SECRET: 'a'.repeat(32), JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('env validation', () => {
  it('accepts a valid env and applies defaults', () => {
    const e = parseEnv(base);
    expect(e.ACCESS_TTL_SECONDS).toBe(900);
    expect(e.FORECAST_CRON).toBe('0 2 * * *');
  });
  it('rejects short secrets without echoing them', () => {
    expect(() => parseEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
    try { parseEnv({ ...base, JWT_ACCESS_SECRET: 'short' }); } catch (e) { expect(String(e)).not.toContain('short'.padEnd(6)); }
  });
  it('rejects missing required vars', () => {
    expect(() => parseEnv({})).toThrow(/MONGODB_URI/);
  });
});

describe('errors and time', () => {
  it('maps error classes to http statuses', () => {
    expect(new ValidationError({}).status).toBe(400);
    expect(new UnauthorizedError().status).toBe(401);
    expect(new NotFoundError().status).toBe(404);
    expect(new ConflictError().status).toBe(409);
    expect(new RateLimitError().status).toBe(429);
    expect(new ConflictError()).toBeInstanceOf(AppError);
  });
  it('groups a late-night UTC time into the next IST service day', () => {
    // 2026-11-12 20:00 UTC = 2026-11-13 01:30 IST
    expect(istDateKey(new Date('2026-11-12T20:00:00Z'))).toBe('2026-11-13');
  });
});
