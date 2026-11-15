import { NextResponse, type NextRequest } from 'next/server';
import { clientIp, errorResponse } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { verifyEmailCode } from '@/modules/users/user.service';
import { signAccessToken, signRefreshToken, ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions } from '@/core/auth/jwt';
import { getEnv } from '@/config/env';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(64),
  institutionSlug: z.string().optional().default('thapar-demo'),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const ip = clientIp(req);
    await enforceRateLimit(`verify-email:${ip}`);

    const raw = await req.json();
    const body = verifyEmailSchema.parse(raw);
    const { user, institution } = await verifyEmailCode(body);

    const session = {
      userId: user._id.toString(),
      institutionId: institution.id,
      role: user.role,
      hallIds: user.hallIds || [],
    };

    const env = getEnv();
    const accessToken = await signAccessToken(session);
    const refreshToken = await signRefreshToken(session.userId, session.institutionId);

    const res = NextResponse.json({
      data: {
        verified: true,
        user,
        institution,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: env.ACCESS_TTL_SECONDS,
        },
        message: 'Email verified successfully! Welcome to FoodFlow.',
      },
    });

    res.cookies.set(ACCESS_COOKIE, accessToken, cookieOptions(env.ACCESS_TTL_SECONDS));
    res.cookies.set(REFRESH_COOKIE, refreshToken, cookieOptions(env.REFRESH_TTL_SECONDS));

    return res;
  } catch (e) {
    return errorResponse(e, requestId);
  }
}

