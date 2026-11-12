import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { hashPassword, verifyPassword, toSafeUser, authenticateUser } from '@/modules/users/user.service';
import { UserModel } from '@/modules/users/user.model';
import { InstitutionModel } from '@/core/tenant/institution.model';
import { signAccessToken } from '@/core/auth/jwt';
import * as db from '@/lib/db';
import * as rateLimit from '@/lib/rate-limit';
import * as audit from '@/core/audit/audit.service';
import { POST as loginRoute } from '@/app/api/v1/auth/login/route';
import { GET as meRoute } from '@/app/api/v1/auth/me/route';
import { POST as logoutRoute } from '@/app/api/v1/auth/logout/route';

describe('Auth & User Services and Endpoints', () => {
  beforeAll(() => {
    process.env.MONGODB_URI ??= 'mongodb://localhost:27017/test';
    process.env.REDIS_URL ??= 'redis://localhost:6379';
    process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
  });

  beforeEach(() => {
    vi.spyOn(db, 'connectDb').mockResolvedValue({} as never);
    vi.spyOn(rateLimit, 'enforceRateLimit').mockResolvedValue(undefined);
    vi.spyOn(audit, 'writeAudit').mockResolvedValue(undefined);
  });

  it('correctly hashes and verifies passwords using bcrypt', async () => {
    const raw = 'SecurePassword123!';
    const hash = await hashPassword(raw);
    expect(hash).not.toBe(raw);
    expect(hash.startsWith('$2')).toBe(true);

    const matches = await verifyPassword(raw, hash);
    expect(matches).toBe(true);

    const falseMatch = await verifyPassword('WrongPassword', hash);
    expect(falseMatch).toBe(false);
  });

  it('toSafeUser strips hashedPassword completely', () => {
    const userDoc = {
      _id: '507f1f77bcf86cd799439011',
      institutionId: 'inst_test',
      email: 'test@thapar.edu',
      hashedPassword: '$2a$10$abcdefghijklmnopqrstuvwxyz123456789',
      fullName: 'Test User',
      role: 'admin' as const,
      hallIds: [],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const safe = toSafeUser(userDoc as never);
    expect((safe as Record<string, unknown>).hashedPassword).toBeUndefined();
    expect(safe.email).toBe('test@thapar.edu');
    expect(safe.role).toBe('admin');
  });

  it('POST /api/v1/auth/login succeeds with valid credentials', async () => {
    const hashedPassword = await hashPassword('Password123!');
    const mockUser = {
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      institutionId: 'inst_1',
      email: 'manager@thapar.edu',
      hashedPassword,
      fullName: 'Mess Manager',
      role: 'mess_manager',
      hallIds: ['hall_a'],
      active: true,
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(InstitutionModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'inst_1',
        name: 'Thapar Demo',
        code: 'THAPAR_DEMO',
        slug: 'thapar-demo',
      }),
    } as never);

    vi.spyOn(UserModel, 'findOne').mockResolvedValue(mockUser as never);

    const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'manager@thapar.edu',
        password: 'Password123!',
        institutionSlug: 'thapar-demo',
      }),
    });

    const res = await loginRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.data.user.email).toBe('manager@thapar.edu');
    expect(data.data.tokens.accessToken).toBeDefined();
    expect(data.data.tokens.refreshToken).toBeDefined();
    expect(data.data.user.hashedPassword).toBeUndefined();
  });

  it('POST /api/v1/auth/login returns 401 on wrong password', async () => {
    const hashedPassword = await hashPassword('CorrectPassword123!');
    const mockUser = {
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      institutionId: 'inst_1',
      email: 'manager@thapar.edu',
      hashedPassword,
      fullName: 'Mess Manager',
      role: 'mess_manager',
      hallIds: [],
      active: true,
      save: vi.fn(),
    };

    vi.spyOn(InstitutionModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'inst_1', slug: 'thapar-demo' }),
    } as never);

    vi.spyOn(UserModel, 'findOne').mockResolvedValue(mockUser as never);

    const req = new NextRequest('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'manager@thapar.edu',
        password: 'WrongPassword123!',
        institutionSlug: 'thapar-demo',
      }),
    });

    const res = await loginRoute(req);
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/auth/me returns profile for authenticated user', async () => {
    const token = await signAccessToken({
      userId: '507f1f77bcf86cd799439011',
      institutionId: 'inst_1',
      role: 'kitchen_staff',
      hallIds: ['hall_a'],
    });

    vi.spyOn(UserModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        institutionId: 'inst_1',
        email: 'kitchen@thapar.edu',
        fullName: 'Kitchen Chef',
        role: 'kitchen_staff',
        hallIds: ['hall_a'],
        active: true,
      }),
    } as never);

    vi.spyOn(InstitutionModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'inst_1',
        name: 'Thapar Institute',
        slug: 'thapar-demo',
        code: 'THAPAR',
      }),
    } as never);

    const req = new NextRequest('http://localhost:3000/api/v1/auth/me', {
      headers: { authorization: `Bearer ${token}` },
    });

    const res = await meRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.email).toBe('kitchen@thapar.edu');
    expect(body.data.institution.slug).toBe('thapar-demo');
  });

  it('POST /api/v1/auth/logout clears cookies', async () => {
    const res = await logoutRoute();
    expect(res.status).toBe(200);
    const cookies = res.headers.get('set-cookie');
    expect(cookies).toContain('access_token=;');
    expect(cookies).toContain('refresh_token=;');
  });
});
