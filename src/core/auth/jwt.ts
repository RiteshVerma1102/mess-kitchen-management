import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { getEnv } from '@/config/env';
import { ROLES } from '@/core/rbac/policy';
import { UnauthorizedError } from '@/lib/errors';
import type { Session } from './session';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

const key = (secret: string) => new TextEncoder().encode(secret);

const claims = z.object({
  sub: z.string().min(1),
  inst: z.string().min(1),
  role: z.enum(ROLES),
  halls: z.array(z.string()).default([]),
});

export async function signAccessToken(s: Session): Promise<string> {
  const env = getEnv();
  return new SignJWT({ inst: s.institutionId, role: s.role, halls: s.hallIds })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.userId)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TTL_SECONDS}s`)
    .sign(key(env.JWT_ACCESS_SECRET));
}

export async function signRefreshToken(userId: string, institutionId: string): Promise<string> {
  const env = getEnv();
  return new SignJWT({ inst: institutionId, typ: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${env.REFRESH_TTL_SECONDS}s`)
    .sign(key(env.JWT_REFRESH_SECRET));
}

export async function verifyAccessToken(token: string): Promise<Session> {
  try {
    const { payload } = await jwtVerify(token, key(getEnv().JWT_ACCESS_SECRET), { algorithms: ['HS256'] });
    const c = claims.parse(payload);
    return { userId: c.sub, institutionId: c.inst, role: c.role, hallIds: c.halls };
  } catch {
    throw new UnauthorizedError('Invalid or expired session');
  }
}

// Bearer first (API clients / kitchen tablets), Cookie second (browser).
export async function getSession(req: NextRequest): Promise<Session> {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || undefined;
  const token = bearer ?? req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) throw new UnauthorizedError();
  return verifyAccessToken(token);
}

export const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: maxAgeSeconds,
});
