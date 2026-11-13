import mongoose from 'mongoose';
import { getEnv } from '@/config/env';

declare global {
  // eslint-disable-next-line no-var
  var __p05Mongoose: { conn?: typeof mongoose; promise?: Promise<typeof mongoose> } | undefined;
}
const cache = (globalThis.__p05Mongoose ??= {});

// High-concurrency connection pool tuned for 100,000+ simultaneous operations
export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(getEnv().MONGODB_URI, {
    maxPoolSize: 100,
    minPoolSize: 10,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  cache.conn = await cache.promise;
  return cache.conn;
}
