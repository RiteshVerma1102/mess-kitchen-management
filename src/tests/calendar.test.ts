import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/core/auth/jwt';
import { CalendarEventModel } from '@/modules/calendar/calendar.model';
import { MenuModel } from '@/modules/menus/menu.model';
import * as db from '@/lib/db';
import * as rateLimit from '@/lib/rate-limit';
import * as audit from '@/core/audit/audit.service';
import { GET as getDailyRoute } from '@/app/api/v1/calendar/daily/route';
import { GET as getMonthlyRoute } from '@/app/api/v1/calendar/monthly/route';
import { POST as createEventRoute } from '@/app/api/v1/calendar/events/route';

describe('Calendar APIs (M3)', () => {
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

  it('GET /api/v1/calendar/daily returns daily schedule, events, and meal timings', async () => {
    const token = await signAccessToken({
      userId: 'u_student',
      institutionId: 'inst_1',
      role: 'student',
      hallIds: [],
    });

    vi.spyOn(CalendarEventModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: '507f1f77bcf86cd799439011',
          date: '2026-11-20',
          title: 'Guru Nanak Jayanti',
          eventType: 'holiday',
          impactMultiplier: 0.25,
          affectedMeals: ['breakfast', 'lunch', 'dinner'],
        },
      ]),
    } as never);

    vi.spyOn(MenuModel, 'findOne').mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    } as never);

    const req = new NextRequest('http://localhost:3000/api/v1/calendar/daily?date=2026-11-20', {
      headers: { authorization: `Bearer ${token}` },
    });

    const res = await getDailyRoute(req, { params: {} });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.date).toBe('2026-11-20');
    expect(body.data.isHoliday).toBe(true);
    expect(body.data.impactMultiplier).toBe(0.25);
    expect(body.data.mealTimings.breakfast).toBe('07:30 - 09:30');
    expect(body.data.events.length).toBe(1);
  });

  it('GET /api/v1/calendar/monthly aggregates days for the requested month', async () => {
    const token = await signAccessToken({
      userId: 'u_manager',
      institutionId: 'inst_1',
      role: 'mess_manager',
      hallIds: [],
    });

    vi.spyOn(CalendarEventModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          _id: '507f1f77bcf86cd799439011',
          date: '2026-11-15',
          title: 'Tech Fest Day 1',
          eventType: 'fest',
        },
      ]),
    } as never);

    const req = new NextRequest('http://localhost:3000/api/v1/calendar/monthly?year=2026&month=11', {
      headers: { authorization: `Bearer ${token}` },
    });

    const res = await getMonthlyRoute(req, { params: {} });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.year).toBe(2026);
    expect(body.data.month).toBe(11);
    expect(body.data.totalDays).toBe(30);
    expect(body.data.days.length).toBe(30);

    const day15 = body.data.days.find((d: { dayOfMonth: number }) => d.dayOfMonth === 15);
    expect(day15).toBeDefined();
    expect(day15.eventsCount).toBe(1);
    expect(day15.eventTypes).toContain('fest');
  });

  it('student cannot create calendar events (403), mess_manager can (201)', async () => {
    const studentToken = await signAccessToken({
      userId: 'u_student',
      institutionId: 'inst_1',
      role: 'student',
      hallIds: [],
    });

    const studentReq = new NextRequest('http://localhost:3000/api/v1/calendar/events', {
      method: 'POST',
      headers: { authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        date: '2026-12-25',
        title: 'Christmas',
        eventType: 'holiday',
      }),
    });

    const studentRes = await createEventRoute(studentReq, { params: {} });
    expect(studentRes.status).toBe(403);

    const managerToken = await signAccessToken({
      userId: 'u_manager',
      institutionId: 'inst_1',
      role: 'mess_manager',
      hallIds: [],
    });

    vi.spyOn(CalendarEventModel, 'create').mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      date: '2026-12-25',
      title: 'Christmas',
      eventType: 'holiday',
      toObject: () => ({
        _id: '507f1f77bcf86cd799439011',
        date: '2026-12-25',
        title: 'Christmas',
        eventType: 'holiday',
      }),
    } as never);

    const managerReq = new NextRequest('http://localhost:3000/api/v1/calendar/events', {
      method: 'POST',
      headers: { authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        date: '2026-12-25',
        title: 'Christmas',
        eventType: 'holiday',
      }),
    });

    const managerRes = await createEventRoute(managerReq, { params: {} });
    expect(managerRes.status).toBe(201);
  });
});
