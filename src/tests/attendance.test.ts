import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/core/auth/jwt';
import { AttendanceModel } from '@/modules/attendance/attendance.model';
import { MealConsumptionModel } from '@/modules/attendance/consumption.model';
import { StudentModel } from '@/modules/students/student.model';
import * as db from '@/lib/db';
import * as rateLimit from '@/lib/rate-limit';
import * as audit from '@/core/audit/audit.service';
import { POST as markAttendanceRoute, GET as listAttendanceRoute } from '@/app/api/v1/attendance/route';
import { POST as syncAttendanceRoute } from '@/app/api/v1/attendance/sync/route';

describe('Offline-First Attendance Module (M2)', () => {
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

  it('marks attendance successfully online with server validation', async () => {
    const staffToken = await signAccessToken({
      userId: 'u_staff',
      institutionId: 'inst_1',
      role: 'kitchen_staff',
      hallIds: ['hall_a'],
    });

    // Mock student lookup
    vi.spyOn(StudentModel, 'findOne').mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      enrollmentNumber: '102203001',
      fullName: 'Aman Sharma',
      dietaryPreference: 'vegetarian',
      mealPlanStatus: 'active',
    } as never);

    // Mock no existing scan
    vi.spyOn(AttendanceModel, 'findOne').mockResolvedValue(null as never);

    // Mock creation
    vi.spyOn(AttendanceModel, 'create').mockResolvedValue({
      _id: { toString: () => '507f1f77bcf86cd799439099' },
      studentRef: '102203001',
      messHallId: 'hall_a',
      serviceDate: '2026-11-20',
      mealType: 'lunch',
      offlineSynced: false,
    } as never);

    // Mock consumption increment
    vi.spyOn(MealConsumptionModel, 'findOneAndUpdate').mockResolvedValue({} as never);

    const clientUuid = '123e4567-e89b-12d3-a456-426614174000';
    const req = new NextRequest('http://localhost:3000/api/v1/attendance', {
      method: 'POST',
      headers: { authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        studentRef: '102203001',
        messHallId: 'hall_a',
        serviceDate: '2026-11-20',
        mealType: 'lunch',
        method: 'qr',
        clientUuid,
        deviceId: 'tablet_gate_1',
        clientTimestamp: new Date().toISOString(),
      }),
    });

    const res = await markAttendanceRoute(req, { params: {} });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.status).toBe('marked');
    expect(body.data.student.enrollmentNumber).toBe('102203001');
  });

  it('blocks duplicate attendance scan in the same meal session with 409 Conflict', async () => {
    const staffToken = await signAccessToken({
      userId: 'u_staff',
      institutionId: 'inst_1',
      role: 'kitchen_staff',
      hallIds: ['hall_a'],
    });

    vi.spyOn(StudentModel, 'findOne').mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      enrollmentNumber: '102203001',
      fullName: 'Aman Sharma',
      dietaryPreference: 'vegetarian',
      mealPlanStatus: 'active',
    } as never);

    // First lookup for clientUuid returns null, second lookup for existing meal scan returns existing record!
    vi.spyOn(AttendanceModel, 'findOne')
      .mockResolvedValueOnce(null as never) // clientUuid check
      .mockResolvedValueOnce({ _id: 'existing_scan_id' } as never); // studentRef + meal check

    const req = new NextRequest('http://localhost:3000/api/v1/attendance', {
      method: 'POST',
      headers: { authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        studentRef: '102203001',
        messHallId: 'hall_a',
        serviceDate: '2026-11-20',
        mealType: 'lunch',
        method: 'rfid',
        clientUuid: '123e4567-e89b-12d3-a456-426614174001',
        deviceId: 'tablet_gate_1',
      }),
    });

    const res = await markAttendanceRoute(req, { params: {} });
    expect(res.status).toBe(409);
  });

  it('handles offline batch sync idempotently with duplicate detection and clock skew', async () => {
    const staffToken = await signAccessToken({
      userId: 'u_staff',
      institutionId: 'inst_1',
      role: 'kitchen_staff',
      hallIds: ['hall_a'],
    });

    vi.spyOn(StudentModel, 'findOne').mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      enrollmentNumber: '102203002',
      fullName: 'Simran Kaur',
      dietaryPreference: 'vegetarian',
      mealPlanStatus: 'active',
    } as never);

    // Item 1: new sync -> findOne returns null, created
    // Item 2: duplicate sync -> findOne returns existing document
    vi.spyOn(AttendanceModel, 'findOne')
      .mockResolvedValueOnce(null as never) // uuid 1
      .mockResolvedValueOnce(null as never) // meal 1
      .mockResolvedValueOnce({ clientUuid: 'uuid-2-already-synced' } as never); // uuid 2 already in DB

    vi.spyOn(AttendanceModel, 'create').mockResolvedValue({} as never);
    vi.spyOn(MealConsumptionModel, 'findOneAndUpdate').mockResolvedValue({} as never);

    const req = new NextRequest('http://localhost:3000/api/v1/attendance/sync', {
      method: 'POST',
      headers: { authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        records: [
          {
            studentRef: '102203002',
            messHallId: 'hall_a',
            serviceDate: '2026-11-20',
            mealType: 'breakfast',
            method: 'manual',
            clientUuid: '123e4567-e89b-12d3-a456-426614174010',
            deviceId: 'tablet_gate_1',
            clientTimestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          },
          {
            studentRef: '102203002',
            messHallId: 'hall_a',
            serviceDate: '2026-11-20',
            mealType: 'breakfast',
            method: 'manual',
            clientUuid: '123e4567-e89b-12d3-a456-426614174011',
            deviceId: 'tablet_gate_1',
          },
        ],
      }),
    });

    const res = await syncAttendanceRoute(req, { params: {} });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.total).toBe(2);
    expect(body.data.syncedCount).toBe(1);
    expect(body.data.duplicateCount).toBe(1);
    expect(body.data.failedCount).toBe(0);
  });

  it('rejects attendance marked for unauthorized dining hall by kitchen staff', async () => {
    // kitchen_staff only assigned to hall_b, attempting to mark in hall_a
    const restrictedToken = await signAccessToken({
      userId: 'u_kitchen_b',
      institutionId: 'inst_1',
      role: 'kitchen_staff',
      hallIds: ['hall_b'],
    });

    const req = new NextRequest('http://localhost:3000/api/v1/attendance', {
      method: 'POST',
      headers: { authorization: `Bearer ${restrictedToken}` },
      body: JSON.stringify({
        studentRef: '102203001',
        messHallId: 'hall_a', // not in assigned halls
        serviceDate: '2026-11-20',
        mealType: 'lunch',
        method: 'manual',
        clientUuid: '123e4567-e89b-12d3-a456-426614174099',
        deviceId: 'tablet_gate_1',
      }),
    });

    const res = await markAttendanceRoute(req, { params: {} });
    expect(res.status).toBe(403);
  });
});
