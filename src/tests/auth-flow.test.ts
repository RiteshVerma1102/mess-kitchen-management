import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  registerUser,
  verifyEmailCode,
  authenticateUser,
  requestPasswordReset,
  resetPasswordWithToken,
} from '@/modules/users/user.service';
import { UserModel } from '@/modules/users/user.model';
import { InstitutionModel } from '@/core/tenant/institution.model';
import { getLatestEmailFor, clearOutbox } from '@/lib/email';
import * as db from '@/lib/db';
import * as rateLimit from '@/lib/rate-limit';
import * as audit from '@/core/audit/audit.service';
import { POST as signupRoute } from '@/app/api/v1/auth/signup/route';
import { POST as verifyEmailRoute } from '@/app/api/v1/auth/verify-email/route';
import { POST as forgotPasswordRoute } from '@/app/api/v1/auth/forgot-password/route';
import { POST as resetPasswordRoute } from '@/app/api/v1/auth/reset-password/route';

describe('Real-World Clerk-Style Authentication Flow Lifecycle', () => {
  beforeAll(() => {
    process.env.MONGODB_URI ??= 'mongodb://localhost:27017/test';
    process.env.REDIS_URL ??= 'redis://localhost:6379';
    process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(db, 'connectDb').mockResolvedValue({} as never);
    vi.spyOn(rateLimit, 'enforceRateLimit').mockResolvedValue(undefined);
    vi.spyOn(audit, 'writeAudit').mockResolvedValue(undefined);
    clearOutbox();
  });

  it('rejects registration with weak passwords (< 8 characters)', async () => {
    vi.spyOn(InstitutionModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'inst_demo', slug: 'thapar-demo' }),
    } as never);

    await expect(
      registerUser({
        fullName: 'Test Student',
        email: 'weakpass@thapar.edu',
        password: 'weak',
        institutionSlug: 'thapar-demo',
      })
    ).rejects.toThrow('Password must be at least 8 characters long');
  });

  it('registers user with unverified status and dispatches 6-digit code via email', async () => {
    const mockInst = {
      _id: 'inst_demo',
      slug: 'thapar-demo',
      name: 'Thapar Institute',
      code: 'THAPAR',
    };

    vi.spyOn(InstitutionModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockInst),
    } as never);

    vi.spyOn(UserModel, 'findOne').mockResolvedValue(null as never);

    let savedUserData: Record<string, unknown> = {};
    vi.spyOn(UserModel, 'create').mockImplementation(async (docs: unknown) => {
      savedUserData = { ...(docs as Record<string, unknown>), _id: 'new_user_123' };
      return savedUserData as never;
    });

    const result = await registerUser({
      fullName: 'Alex River',
      email: 'alex@thapar.edu',
      password: 'SecurePassword123!',
      institutionSlug: 'thapar-demo',
    });

    expect(result.user.email).toBe('alex@thapar.edu');
    expect(result.user.isEmailVerified).toBe(false);
    expect(savedUserData.isEmailVerified).toBe(false);
    expect(savedUserData.verificationCode).toBeDefined();

    // Verify email outbox received verification message with 6-digit code
    const sentEmail = getLatestEmailFor('alex@thapar.edu');
    expect(sentEmail).toBeDefined();
    expect(sentEmail?.subject).toContain('Verification Code');
    expect(sentEmail?.html).toContain(savedUserData.verificationCode as string);
  });

  it('rejects duplicate email registrations with a Conflict error', async () => {
    vi.spyOn(InstitutionModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'inst_demo', slug: 'thapar-demo' }),
    } as never);

    vi.spyOn(UserModel, 'findOne').mockResolvedValue({
      _id: 'existing_user',
      email: 'alex@thapar.edu',
    } as never);

    await expect(
      registerUser({
        fullName: 'Alex Duplicate',
        email: 'alex@thapar.edu',
        password: 'SecurePassword123!',
        institutionSlug: 'thapar-demo',
      })
    ).rejects.toThrow(/already exists/i);
  });

  it('blocks unverified user from logging in with 403 Email verification required', async () => {
    const mockInst = { _id: 'inst_demo', slug: 'thapar-demo' };
    vi.spyOn(InstitutionModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockInst),
    } as never);

    const { hashPassword } = await import('@/modules/users/user.service');
    const hashedPassword = await hashPassword('SecurePassword123!');

    vi.spyOn(UserModel, 'findOne').mockResolvedValue({
      _id: 'unverified_1',
      institutionId: 'inst_demo',
      email: 'alex@thapar.edu',
      hashedPassword,
      fullName: 'Alex River',
      role: 'student',
      hallIds: [],
      active: true,
      isEmailVerified: false,
    } as never);

    await expect(
      authenticateUser({
        email: 'alex@thapar.edu',
        password: 'SecurePassword123!',
        institutionSlug: 'thapar-demo',
      })
    ).rejects.toThrow('Email verification required');
  });

  it('rejects invalid or expired email verification codes', async () => {
    vi.spyOn(InstitutionModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'inst_demo', slug: 'thapar-demo' }),
    } as never);

    const mockUser = {
      _id: 'user_1',
      email: 'alex@thapar.edu',
      verificationCode: '654321',
      verificationCodeExpiresAt: new Date(Date.now() + 60000),
      isEmailVerified: false,
    };

    vi.spyOn(UserModel, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser),
    } as never);

    await expect(
      verifyEmailCode({
        email: 'alex@thapar.edu',
        code: '000000',
        institutionSlug: 'thapar-demo',
      })
    ).rejects.toThrow('Invalid verification code');
  });

  it('verifies account with valid 6-digit code and activates user', async () => {
    vi.spyOn(InstitutionModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'inst_demo',
        slug: 'thapar-demo',
        name: 'Thapar Institute',
        code: 'THAPAR',
      }),
    } as never);

    const saveMock = vi.fn().mockResolvedValue(true);
    const mockUser = {
      _id: { toString: () => 'user_1' },
      institutionId: 'inst_demo',
      email: 'alex@thapar.edu',
      fullName: 'Alex River',
      role: 'student' as const,
      hallIds: [],
      active: true,
      verificationCode: '123456',
      verificationCodeExpiresAt: new Date(Date.now() + 60000),
      isEmailVerified: false,
      save: saveMock,
    };

    vi.spyOn(UserModel, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser),
    } as never);

    const result = await verifyEmailCode({
      email: 'alex@thapar.edu',
      code: '123456',
      institutionSlug: 'thapar-demo',
    });

    expect(saveMock).toHaveBeenCalled();
    expect(mockUser.isEmailVerified).toBe(true);
    expect(mockUser.verificationCode).toBeUndefined();
    expect(result.user.isEmailVerified).toBe(true);
    expect(result.institution.slug).toBe('thapar-demo');
  });

  it('dispatches password reset token via email and resets password securely', async () => {
    vi.spyOn(InstitutionModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'inst_demo', slug: 'thapar-demo' }),
    } as never);

    const saveMock = vi.fn().mockResolvedValue(true);
    const mockUser = {
      _id: { toString: () => 'user_1' },
      institutionId: 'inst_demo',
      email: 'alex@thapar.edu',
      fullName: 'Alex River',
      role: 'student' as const,
      hallIds: [],
      active: true,
      isEmailVerified: true,
      resetPasswordToken: undefined as string | undefined,
      resetPasswordExpiresAt: undefined as Date | undefined,
      hashedPassword: '$2a$10$oldhashedpassword',
      save: saveMock,
    };

    vi.spyOn(UserModel, 'findOne').mockResolvedValue(mockUser as never);

    // 1. Request password reset
    const reqResult = await requestPasswordReset({
      email: 'alex@thapar.edu',
      institutionSlug: 'thapar-demo',
    });
    expect(reqResult).toBe(true);

    // Verify email outbox received password reset instructions with token
    const resetEmail = getLatestEmailFor('alex@thapar.edu');
    expect(resetEmail).toBeDefined();
    expect(resetEmail?.subject).toContain('Reset Your FoodFlow Password');
    expect(mockUser.resetPasswordToken).toBeDefined();

    const activeToken = mockUser.resetPasswordToken as string;

    // 2. Reject reset with invalid token
    vi.spyOn(UserModel, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as never);

    await expect(
      resetPasswordWithToken({
        token: 'invalid_token_xyz',
        newPassword: 'BrandNewPassword999!',
      })
    ).rejects.toThrow('Invalid or expired password reset link');

    // 3. Succeed reset with active token
    vi.spyOn(UserModel, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser),
    } as never);

    const resetSuccess = await resetPasswordWithToken({
      token: activeToken,
      newPassword: 'BrandNewPassword999!',
    });
    expect(resetSuccess).toBe(true);
    expect(mockUser.resetPasswordToken).toBeUndefined();
    expect(mockUser.resetPasswordExpiresAt).toBeUndefined();
  });

  it('POST /api/v1/auth/signup route handler processes valid payload and returns 201', async () => {
    vi.spyOn(InstitutionModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'inst_demo', slug: 'thapar-demo' }),
    } as never);
    vi.spyOn(UserModel, 'findOne').mockResolvedValue(null as never);
    vi.spyOn(UserModel, 'create').mockResolvedValue({
      _id: 'new_1',
      fullName: 'Chef Marco',
      email: 'marco@thapar.edu',
      role: 'student',
      isEmailVerified: false,
    } as never);

    const req = new NextRequest('http://localhost:3000/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Chef Marco',
        email: 'marco@thapar.edu',
        password: 'ComplexPassword123!',
        institutionSlug: 'thapar-demo',
      }),
    });

    const res = await signupRoute(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.user.email).toBe('marco@thapar.edu');
    expect(body.data.user.isEmailVerified).toBe(false);
  });

  it('POST /api/v1/auth/verify-email sets auth session cookies and returns verified user', async () => {
    vi.spyOn(InstitutionModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'inst_demo',
        slug: 'thapar-demo',
        name: 'Thapar Institute',
        code: 'THAPAR',
      }),
    } as never);

    const mockUser = {
      _id: { toString: () => 'user_1' },
      institutionId: 'inst_demo',
      email: 'marco@thapar.edu',
      fullName: 'Chef Marco',
      role: 'student' as const,
      hallIds: [],
      active: true,
      verificationCode: '445566',
      verificationCodeExpiresAt: new Date(Date.now() + 60000),
      isEmailVerified: false,
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(UserModel, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser),
    } as never);

    const req = new NextRequest('http://localhost:3000/api/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        email: 'marco@thapar.edu',
        code: '445566',
        institutionSlug: 'thapar-demo',
      }),
    });

    const res = await verifyEmailRoute(req);
    expect(res.status).toBe(200);
    const cookies = res.headers.get('set-cookie');
    expect(cookies).toContain('access_token=');
    expect(cookies).toContain('refresh_token=');
  });
});
