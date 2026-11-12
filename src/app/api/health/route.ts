import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Liveness: the process is up. No dependencies checked here.
export function GET() {
  return NextResponse.json({ status: 'ok', time: new Date().toISOString() });
}
