import { z } from 'zod';

// All configuration comes from environment variables, validated once, lazily
// (lazy so `next build` does not need production secrets).
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  FORECAST_CRON: z.string().default('0 2 * * *'),
  REMINDER_CRON: z.string().default('30 22 * * *'),
  SENTRY_DSN: z.string().optional(),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(300),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const fields = Object.keys(result.error.flatten().fieldErrors).join(', ');
    throw new Error(`Invalid environment configuration. Check: ${fields}`);
  }
  return result.data;
}

let cached: Env | undefined;
export function getEnv(): Env {
  if (!cached) cached = parseEnv(process.env);
  return cached;
}
