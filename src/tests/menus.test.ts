import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/core/auth/jwt';
import { MenuModel } from '@/modules/menus/menu.model';
import * as db from '@/lib/db';
import * as rateLimit from '@/lib/rate-limit';
import * as audit from '@/core/audit/audit.service';
import { POST as createMenuRoute, GET as listMenusRoute } from '@/app/api/v1/menus/route';
import { DELETE as deleteMenuRoute } from '@/app/api/v1/menus/[id]/route';

describe('Menu APIs (M1) RBAC and Operations', () => {
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

  it('student role cannot create menu (403 Forbidden)', async () => {
    const studentToken = await signAccessToken({
      userId: 'u_student',
      institutionId: 'inst_1',
      role: 'student',
      hallIds: [],
    });

    const req = new NextRequest('http://localhost:3000/api/v1/menus', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${studentToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Hacked Menu',
        cycleType: 'weekly',
        dayOfWeek: 1,
        meals: { breakfast: [], lunch: [], snacks: [], dinner: [] },
      }),
    });

    const res = await createMenuRoute(req, { params: {} });
    expect(res.status).toBe(403);
  });

  it('mess_manager can create menu (201 Created)', async () => {
    const managerToken = await signAccessToken({
      userId: 'u_manager',
      institutionId: 'inst_1',
      role: 'mess_manager',
      hallIds: [],
    });

    vi.spyOn(MenuModel, 'create').mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      name: 'Monday Delights',
      cycleType: 'weekly',
      status: 'draft',
      toObject: () => ({
        _id: '507f1f77bcf86cd799439011',
        name: 'Monday Delights',
        cycleType: 'weekly',
        status: 'draft',
      }),
    } as never);

    const req = new NextRequest('http://localhost:3000/api/v1/menus', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${managerToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Monday Delights',
        cycleType: 'weekly',
        dayOfWeek: 1,
        meals: { breakfast: [], lunch: [], snacks: [], dinner: [] },
      }),
    });

    const res = await createMenuRoute(req, { params: {} });
    expect(res.status).toBe(201);
  });

  it('student can read published menus (200 OK)', async () => {
    const studentToken = await signAccessToken({
      userId: 'u_student',
      institutionId: 'inst_1',
      role: 'student',
      hallIds: [],
    });

    vi.spyOn(MenuModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Regular Weekly Cycle',
          status: 'published',
        },
      ]),
    } as never);

    vi.spyOn(MenuModel, 'countDocuments').mockResolvedValue(1 as never);

    const req = new NextRequest('http://localhost:3000/api/v1/menus', {
      headers: { authorization: `Bearer ${studentToken}` },
    });

    const res = await listMenusRoute(req, { params: {} });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.menus.length).toBe(1);
    expect(body.data.total).toBe(1);
  });

  it('DELETE /api/v1/menus/[id] archives published menu instead of hard deleting', async () => {
    const managerToken = await signAccessToken({
      userId: 'u_manager',
      institutionId: 'inst_1',
      role: 'mess_manager',
      hallIds: [],
    });

    // Mock finding published menu
    vi.spyOn(MenuModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        institutionId: 'inst_1',
        name: 'Weekly Active Menu',
        status: 'published',
      }),
    } as never);

    // Mock findOneAndUpdate for archive
    vi.spyOn(MenuModel, 'findOneAndUpdate').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        status: 'archived',
      }),
    } as never);

    const req = new NextRequest('http://localhost:3000/api/v1/menus/507f1f77bcf86cd799439011', {
      method: 'DELETE',
      headers: { authorization: `Bearer ${managerToken}` },
    });

    const res = await deleteMenuRoute(req, { params: { id: '507f1f77bcf86cd799439011' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.archived).toBe(true);
    expect(body.data.success).toBe(true);
  });
});
