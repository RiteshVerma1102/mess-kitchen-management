import { describe, it, expect, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';
import { signAccessToken, getSession, ACCESS_COOKIE } from '@/core/auth/jwt';
import { getEnv } from '@/config/env';
import { UnauthorizedError } from '@/lib/errors';
import type { Session } from '@/core/auth/session';

describe('token precedence in getSession', () => {
  beforeAll(() => {
    process.env.MONGODB_URI ??= 'mongodb://localhost:27017/test';
    process.env.REDIS_URL ??= 'redis://localhost:6379';
    process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
  });

  const createExpiredToken = async (): Promise<string> => {
    const env = getEnv();
    return new SignJWT({ inst: 'inst1', role: 'student', halls: [] })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u-expired')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 50)
      .sign(new TextEncoder().encode(env.JWT_ACCESS_SECRET));
  };

  const validSession: Session = {
    userId: 'u-valid',
    institutionId: 'inst1',
    role: 'student',
    hallIds: ['h1'],
  };

  it('expired cookie plus valid Bearer token succeeds', async () => {
    const expiredToken = await createExpiredToken();
    const validToken = await signAccessToken(validSession);

    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        authorization: `Bearer ${validToken}`,
        cookie: `${ACCESS_COOKIE}=${expiredToken}`,
      },
    });

    const session = await getSession(req);
    expect(session.userId).toBe('u-valid');
    expect(session.institutionId).toBe('inst1');
    expect(session.role).toBe('student');
  });

  it('uses cookie when Bearer token is absent', async () => {
    const validToken = await signAccessToken(validSession);
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        cookie: `${ACCESS_COOKIE}=${validToken}`,
      },
    });

    const session = await getSession(req);
    expect(session.userId).toBe('u-valid');
  });

  it('rejects when only expired cookie is present and no Bearer token', async () => {
    const expiredToken = await createExpiredToken();
    const req = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        cookie: `${ACCESS_COOKIE}=${expiredToken}`,
      },
    });

    await expect(getSession(req)).rejects.toThrow(UnauthorizedError);
  });
});
