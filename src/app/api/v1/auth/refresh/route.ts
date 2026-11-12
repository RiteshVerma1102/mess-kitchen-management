import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { z } from 'zod';
import { errorResponse, clientIp } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { connectDb } from '@/lib/db';
import { UnauthorizedError } from '@/lib/errors';
import { getEnv } from '@/config/env';
import { UserModel, type UserDoc } from '@/modules/users/user.model';
import {
  signAccessToken,
  signRefreshToken,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  cookieOptions,
} from '@/core/auth/jwt';
import type { Session } from '@/core/auth/session';

export const dynamic = 'force-dynamic';

const refreshPayloadSchema = z.object({
  sub: z.string().min(1),
  inst: z.string().min(1),
  typ: z.literal('refresh'),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const ip = clientIp(req);
    await enforceRateLimit(`refresh:${ip}`);

    let token = req.cookies.get(REFRESH_COOKIE)?.value;
    if (!token) {
      try {
        const body = await req.json();
        token = body?.refreshToken;
      } catch {
        // no body
      }
    }

    if (!token) {
      throw new UnauthorizedError('Missing refresh token');
    }

    const env = getEnv();
    const key = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

    let payload: unknown;
    try {
      const res = await jwtVerify(token, key, { algorithms: ['HS256'] });
      payload = res.payload;
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const claims = refreshPayloadSchema.parse(payload);

    await connectDb();
    const user = await UserModel.findById(claims.sub).lean<UserDoc>();
    if (!user || !user.active) {
      throw new UnauthorizedError('User is no longer active');
    }

    const session: Session = {
      userId: user._id.toString(),
      institutionId: user.institutionId,
      role: user.role,
      hallIds: user.hallIds || [],
    };

    const newAccessToken = await signAccessToken(session);
    const newRefreshToken = await signRefreshToken(session.userId, session.institutionId);

    const res = NextResponse.json({
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: env.ACCESS_TTL_SECONDS,
      },
    });

    res.cookies.set(ACCESS_COOKIE, newAccessToken, cookieOptions(env.ACCESS_TTL_SECONDS));
    res.cookies.set(REFRESH_COOKIE, newRefreshToken, cookieOptions(env.REFRESH_TTL_SECONDS));

    return res;
  } catch (e) {
    return errorResponse(e, requestId);
  }
}
