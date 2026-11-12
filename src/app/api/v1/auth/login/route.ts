import { NextResponse, type NextRequest } from 'next/server';
import { parse, clientIp, errorResponse } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { loginSchema } from '@/modules/users/user.schema';
import { authenticateUser } from '@/modules/users/user.service';
import { signAccessToken, signRefreshToken, ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions } from '@/core/auth/jwt';
import { getEnv } from '@/config/env';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const ip = clientIp(req);
    await enforceRateLimit(`login:${ip}`);

    const body = parse(loginSchema, await req.json());
    const { session, user, institution } = await authenticateUser(body);

    const env = getEnv();
    const accessToken = await signAccessToken(session);
    const refreshToken = await signRefreshToken(session.userId, session.institutionId);

    const res = NextResponse.json({
      data: {
        user,
        institution,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: env.ACCESS_TTL_SECONDS,
        },
      },
    });

    res.cookies.set(ACCESS_COOKIE, accessToken, cookieOptions(env.ACCESS_TTL_SECONDS));
    res.cookies.set(REFRESH_COOKIE, refreshToken, cookieOptions(env.REFRESH_TTL_SECONDS));

    return res;
  } catch (e) {
    return errorResponse(e, requestId);
  }
}
