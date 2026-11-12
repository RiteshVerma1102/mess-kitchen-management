import { NextResponse } from 'next/server';
import { connectDb } from '@/lib/db';
import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

// Readiness: can we serve traffic? Checks MongoDB and Redis.
export async function GET() {
  const checks: Record<string, 'ok' | 'fail'> = { mongo: 'fail', redis: 'fail' };
  try { const m = await connectDb(); await m.connection.db?.admin().ping(); checks.mongo = 'ok'; } catch { /* reported below */ }
  try { await getRedis().ping(); checks.redis = 'ok'; } catch { /* reported below */ }
  const ready = Object.values(checks).every((v) => v === 'ok');
  return NextResponse.json({ ready, checks }, { status: ready ? 200 : 503 });
}
