import { describe, it, expect, beforeEach } from 'vitest';
import { bullConnectionOptions } from '@/lib/redis';

describe('bullConnectionOptions', () => {
  beforeEach(() => {
    process.env.MONGODB_URI ??= 'mongodb://localhost:27017/test';
    process.env.REDIS_URL ??= 'redis://localhost:6379';
    process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
  });

  it('parses standard redis:// URL with custom port and db', () => {
    const opts = bullConnectionOptions('redis://my-redis-host:6380/2');
    expect(opts).toMatchObject({
      host: 'my-redis-host',
      port: 6380,
      db: 2,
      maxRetriesPerRequest: null,
    });
    expect(opts.tls).toBeUndefined();
  });

  it('parses rediss:// URL with auth credentials and TLS', () => {
    const opts = bullConnectionOptions('rediss://username:secretpass@secure-redis.io:6390/5');
    expect(opts).toMatchObject({
      host: 'secure-redis.io',
      port: 6390,
      username: 'username',
      password: 'secretpass',
      db: 5,
      maxRetriesPerRequest: null,
      tls: {},
    });
  });

  it('defaults port to 6379 for redis and 6380 for rediss when port is omitted', () => {
    expect(bullConnectionOptions('redis://simple-host').port).toBe(6379);
    expect(bullConnectionOptions('redis://simple-host').tls).toBeUndefined();

    const secureOpts = bullConnectionOptions('rediss://simple-host');
    expect(secureOpts.port).toBe(6380);
    expect(secureOpts.tls).toEqual({});
  });

  it('reads from env REDIS_URL by default when no argument is passed', () => {
    const opts = bullConnectionOptions();
    expect(opts).toHaveProperty('host');
    expect(opts.maxRetriesPerRequest).toBeNull();
  });
});
