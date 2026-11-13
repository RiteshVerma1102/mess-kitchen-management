import type { RedisOptions } from 'ioredis';
import IORedis from 'ioredis';
import { getEnv } from '@/config/env';

let client: IORedis | undefined;

// Shared client used only for lightweight operations like rate limiting.
export function getRedis(): IORedis {
  if (!client) {
    client = new IORedis(getEnv().REDIS_URL, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      connectTimeout: 500,
      retryStrategy(times) {
        if (times > 3) return null; // stop reconnecting if redis not available
        return Math.min(times * 100, 1000);
      },
    });

    // Suppress unhandled error crashes when Redis is offline
    client.on('error', () => {
      // Intentionally silent fallback
    });
  }
  return client;
}

// Plain connection options for BullMQ Queues and Workers.
// Passing options (rather than a shared IORedis client) allows BullMQ to manage
// dedicated connections per Worker and Queue, preventing blocking-command contention.
export function bullConnectionOptions(redisUrl?: string): RedisOptions {
  const rawUrl = redisUrl ?? getEnv().REDIS_URL;
  const url = new URL(rawUrl);
  const isTls = url.protocol === 'rediss:';

  const options: RedisOptions = {
    host: url.hostname || 'localhost',
    port: url.port ? Number(url.port) : isTls ? 6380 : 6379,
    maxRetriesPerRequest: null,
  };

  if (url.username) {
    options.username = decodeURIComponent(url.username);
  }
  if (url.password) {
    options.password = decodeURIComponent(url.password);
  }
  if (url.pathname && url.pathname.length > 1) {
    const dbIndex = parseInt(url.pathname.substring(1), 10);
    if (!isNaN(dbIndex)) {
      options.db = dbIndex;
    }
  }
  if (isTls) {
    options.tls = {};
  }

  return options;
}
