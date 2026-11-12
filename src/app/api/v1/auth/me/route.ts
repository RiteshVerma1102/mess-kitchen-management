import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/core/auth/jwt';
import { errorResponse } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getUserProfile } from '@/modules/users/user.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const session = await getSession(req);
    await enforceRateLimit(`u:${session.userId}`);
    const profile = await getUserProfile(session);
    return NextResponse.json({ data: profile });
  } catch (e) {
    return errorResponse(e, requestId);
  }
}
