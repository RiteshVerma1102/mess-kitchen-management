import mongoose from 'mongoose';
import { getEnv } from '@/config/env';

declare global {
  // eslint-disable-next-line no-var
  var __p05Mongoose: { conn?: typeof mongoose; promise?: Promise<typeof mongoose> } | undefined;
}
const cache = (globalThis.__p05Mongoose ??= {});

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(getEnv().MONGODB_URI, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000,
  });
  cache.conn = await cache.promise;
  return cache.conn;
}
