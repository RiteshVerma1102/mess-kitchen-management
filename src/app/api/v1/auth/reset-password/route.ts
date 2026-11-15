import { NextResponse, type NextRequest } from 'next/server';
import { clientIp, errorResponse } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { resetPasswordWithToken } from '@/modules/users/user.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Password reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const ip = clientIp(req);
    await enforceRateLimit(`reset-pass:${ip}`);

    const raw = await req.json();
    const body = resetPasswordSchema.parse(raw);
    await resetPasswordWithToken(body);

    return NextResponse.json({
      data: {
        success: true,
        message: 'Password successfully updated. Please log in with your new password.',
      },
    });
  } catch (e) {
    return errorResponse(e, requestId);
  }
}
