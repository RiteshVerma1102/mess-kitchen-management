import { NextResponse, type NextRequest } from 'next/server';
import { clientIp, errorResponse } from '@/lib/http';
import { enforceRateLimit } from '@/lib/rate-limit';
import { registerUser } from '@/modules/users/user.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  institutionSlug: z.string().optional().default('thapar-demo'),
});

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const ip = clientIp(req);
    await enforceRateLimit(`signup:${ip}`);

    const raw = await req.json();
    const body = signupSchema.parse(raw);
    const result = await registerUser(body);

    return NextResponse.json(
      {
        data: {
          user: result.user,
          message: 'Account registered successfully. A 6-digit verification code has been dispatched to your email.',
        },
      },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e, requestId);
  }
}

