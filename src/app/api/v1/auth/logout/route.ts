import { NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieOptions } from '@/core/auth/jwt';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ data: { message: 'Logged out successfully' } });
  res.cookies.set(ACCESS_COOKIE, '', cookieOptions(0));
  res.cookies.set(REFRESH_COOKIE, '', cookieOptions(0));
  return res;
}
