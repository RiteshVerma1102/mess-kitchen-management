import { NextResponse, type NextRequest } from 'next/server';
import { clientIp, errorResponse } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { resendVerificationCode } from '@/modules/users/user.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const resendSchema = z.object({
  email: z.string().email(),
  institutionSlug: z.string().optional().default('thapar-demo'),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const ip = clientIp(req);
    await enforceRateLimit(`resend-code:${ip}`);

    const raw = await req.json();
    const body = resendSchema.parse(raw);
    await resendVerificationCode(body);

    return NextResponse.json({
      data: {
        success: true,
        message: 'A fresh verification code has been dispatched to your email address.',
      },
    });
  } catch (e) {
    return errorResponse(e, requestId);
  }
}

