import { NextResponse, type NextRequest } from 'next/server';
import { clientIp, errorResponse } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { requestPasswordReset } from '@/modules/users/user.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  institutionSlug: z.string().optional().default('thapar-demo'),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const ip = clientIp(req);
    await enforceRateLimit(`forgot-pass:${ip}`);

    const raw = await req.json();
    const body = forgotPasswordSchema.parse(raw);
    await requestPasswordReset(body);

    return NextResponse.json({
      data: {
        success: true,
        message: 'If an active account exists for this email, password reset instructions have been dispatched to your email address.',
      },
    });
  } catch (e) {
    return errorResponse(e, requestId);
  }
}
