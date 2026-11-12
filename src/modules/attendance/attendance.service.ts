import { Types } from 'mongoose';
import { connectDb } from '@/lib/db';
import { AppError, ConflictError, NotFoundError } from '@/lib/errors';
import { assertHall } from '@/core/rbac/policy';
import { writeAudit } from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import { StudentModel } from '@/modules/students/student.model';
import { AttendanceModel, type AttendanceDoc, type IAttendance } from './attendance.model';
import { MealConsumptionModel } from './consumption.model';
import type {
  MarkAttendanceInput,
  ListAttendanceQuery,
  AttendanceSummaryQuery,
} from './attendance.schema';

export interface MarkAttendanceResult {
  status: 'marked' | 'duplicate_blocked' | 'already_synced';
  attendance: AttendanceDoc;
  student: {
    enrollmentNumber: string;
    fullName: string;
    dietaryPreference: string;
    mealPlanStatus: string;
  };
}

export async function markAttendance(
  session: Session,
  input: MarkAttendanceInput,
  ip?: string,
): Promise<MarkAttendanceResult> {
  await connectDb();

  // 1. Assert hall access scope for kitchen staff
  assertHall(session, input.messHallId);

  // 2. Find student by enrollmentNumber, rfidCardId, or opaque ref
  const student = await StudentModel.findOne({
    institutionId: session.institutionId,
    $or: [
      { enrollmentNumber: input.studentRef.toUpperCase() },
      { rfidCardId: input.studentRef },
      ...(Types.ObjectId.isValid(input.studentRef) ? [{ _id: input.studentRef }] : []),
    ],
  });

  if (!student) {
    throw new NotFoundError(`Student "${input.studentRef}" not found in institutional registry`);
  }

  if (student.mealPlanStatus === 'paused') {
    throw new AppError(400, 'MEAL_PLAN_PAUSED', 'Student meal plan is currently on paused/leave status');
  }

  // 3. Check idempotency: if this exact clientUuid was already recorded, return it
  const existingByUuid = await AttendanceModel.findOne({
    institutionId: session.institutionId,
    clientUuid: input.clientUuid,
  });

  if (existingByUuid) {
    return {
      status: 'already_synced',
      attendance: existingByUuid as unknown as AttendanceDoc,
      student: {
        enrollmentNumber: student.enrollmentNumber,
        fullName: student.fullName,
        dietaryPreference: student.dietaryPreference,
        mealPlanStatus: student.mealPlanStatus,
      },
    };
  }

  // 4. Duplicate scan prevention: Check if student already marked present for this meal session
  const existingMealAttendance = await AttendanceModel.findOne({
    institutionId: session.institutionId,
    studentRef: student.enrollmentNumber,
    serviceDate: input.serviceDate,
    mealType: input.mealType,
  });

  if (existingMealAttendance) {
    throw new ConflictError(
      `Student ${student.enrollmentNumber} has already been marked present for ${input.mealType} on ${input.serviceDate}`,
    );
  }

  // 5. Server timestamp validation & clock skew calculation
  const serverTime = new Date();
  let clockSkewSeconds = 0;
  if (input.clientTimestamp) {
    const clientTime = new Date(input.clientTimestamp).getTime();
    if (!isNaN(clientTime)) {
      clockSkewSeconds = Math.round((serverTime.getTime() - clientTime) / 1000);
    }
  }

  // 6. Record attendance
  const created = await AttendanceModel.create({
    institutionId: session.institutionId,
    clientUuid: input.clientUuid,
    studentRef: student.enrollmentNumber,
    studentId: student._id,
    messHallId: input.messHallId,
    serviceDate: input.serviceDate,
    mealType: input.mealType,
    method: input.method,
    scannedAt: serverTime,
    deviceId: input.deviceId,
    offlineSynced: false,
    clockSkewSeconds,
    isSynthetic: false,
  });

  // 7. Update meal consumption aggregate
  await MealConsumptionModel.findOneAndUpdate(
    {
      institutionId: session.institutionId,
      messHallId: input.messHallId,
      serviceDate: input.serviceDate,
      mealType: input.mealType,
    },
    {
      $inc: { headcountActual: 1 },
      $setOnInsert: { isSynthetic: false },
    },
    { upsert: true },
  );

  await writeAudit({
    session,
    ip,
    action: 'attendance.mark',
    target: { type: 'Attendance', id: created._id.toString() },
    after: {
      studentRef: student.enrollmentNumber,
      serviceDate: input.serviceDate,
      mealType: input.mealType,
      method: input.method,
    },
  });

  return {
    status: 'marked',
    attendance: created as unknown as AttendanceDoc,
    student: {
      enrollmentNumber: student.enrollmentNumber,
      fullName: student.fullName,
      dietaryPreference: student.dietaryPreference,
      mealPlanStatus: student.mealPlanStatus,
    },
  };
}

export interface SyncRecordResult {
  clientUuid: string;
  studentRef: string;
  status: 'synced' | 'duplicate' | 'failed';
  error?: string;
}

export interface SyncBatchResponse {
  total: number;
  syncedCount: number;
  duplicateCount: number;
  failedCount: number;
  results: SyncRecordResult[];
}

export async function syncOfflineAttendance(
  session: Session,
  records: MarkAttendanceInput[],
  ip?: string,
): Promise<SyncBatchResponse> {
  await connectDb();

  const results: SyncRecordResult[] = [];
  let syncedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;

  for (const record of records) {
    try {
      // Validate hall scope
      assertHall(session, record.messHallId);

      // Check if clientUuid already exists (already synced previously)
      const existingUuid = await AttendanceModel.findOne({
        institutionId: session.institutionId,
        clientUuid: record.clientUuid,
      });

      if (existingUuid) {
        duplicateCount++;
        results.push({
          clientUuid: record.clientUuid,
          studentRef: record.studentRef,
          status: 'duplicate',
        });
        continue;
      }

      // Resolve student
      const student = await StudentModel.findOne({
        institutionId: session.institutionId,
        $or: [
          { enrollmentNumber: record.studentRef.toUpperCase() },
          { rfidCardId: record.studentRef },
          ...(Types.ObjectId.isValid(record.studentRef) ? [{ _id: record.studentRef }] : []),
        ],
      });

      if (!student) {
        failedCount++;
        results.push({
          clientUuid: record.clientUuid,
          studentRef: record.studentRef,
          status: 'failed',
          error: `Student "${record.studentRef}" not found`,
        });
        continue;
      }

      // Check duplicate student attendance in meal
      const existingMeal = await AttendanceModel.findOne({
        institutionId: session.institutionId,
        studentRef: student.enrollmentNumber,
        serviceDate: record.serviceDate,
        mealType: record.mealType,
      });

      if (existingMeal) {
        duplicateCount++;
        results.push({
          clientUuid: record.clientUuid,
          studentRef: record.studentRef,
          status: 'duplicate',
          error: 'Attendance already recorded for this meal session',
        });
        continue;
      }

      // Server-validated timestamp with clock skew
      const serverTime = new Date();
      let clockSkewSeconds = 0;
      if (record.clientTimestamp) {
        const clientTime = new Date(record.clientTimestamp).getTime();
        if (!isNaN(clientTime)) {
          clockSkewSeconds = Math.round((serverTime.getTime() - clientTime) / 1000);
        }
      }

      // Create attendance tagged offlineSynced: true
      await AttendanceModel.create({
        institutionId: session.institutionId,
        clientUuid: record.clientUuid,
        studentRef: student.enrollmentNumber,
        studentId: student._id,
        messHallId: record.messHallId,
        serviceDate: record.serviceDate,
        mealType: record.mealType,
        method: record.method,
        scannedAt: serverTime,
        deviceId: record.deviceId,
        offlineSynced: true,
        clockSkewSeconds,
        isSynthetic: false,
      });

      // Update consumption count
      await MealConsumptionModel.findOneAndUpdate(
        {
          institutionId: session.institutionId,
          messHallId: record.messHallId,
          serviceDate: record.serviceDate,
          mealType: record.mealType,
        },
        {
          $inc: { headcountActual: 1 },
          $setOnInsert: { isSynthetic: false },
        },
        { upsert: true },
      );

      syncedCount++;
      results.push({
        clientUuid: record.clientUuid,
        studentRef: record.studentRef,
        status: 'synced',
      });
    } catch (err) {
      failedCount++;
      results.push({
        clientUuid: record.clientUuid,
        studentRef: record.studentRef,
        status: 'failed',
        error: (err as Error)?.message || 'Internal sync failure',
      });
    }
  }

  await writeAudit({
    session,
    ip,
    action: 'attendance.sync_batch',
    target: { type: 'AttendanceSync', id: crypto.randomUUID() },
    after: { total: records.length, syncedCount, duplicateCount, failedCount },
  });

  return {
    total: records.length,
    syncedCount,
    duplicateCount,
    failedCount,
    results,
  };
}

export async function listAttendance(
  session: Session,
  query: ListAttendanceQuery,
): Promise<{ attendance: Record<string, unknown>[]; total: number; limit: number; skip: number }> {
  await connectDb();

  const filter: Record<string, unknown> = {
    institutionId: session.institutionId,
  };
  if (query.date) filter.serviceDate = query.date;
  if (query.mealType) filter.mealType = query.mealType;
  if (query.messHallId && query.messHallId !== 'all') filter.messHallId = query.messHallId;
  if (query.studentRef) filter.studentRef = { $regex: query.studentRef, $options: 'i' };

  const [records, total] = await Promise.all([
    AttendanceModel.find(filter)
      .populate('studentId', 'fullName enrollmentNumber hostelName roomNumber dietaryPreference')
      .sort({ scannedAt: -1 })
      .skip(query.skip)
      .limit(query.limit)
      .lean(),
    AttendanceModel.countDocuments(filter),
  ]);

  return {
    attendance: records as unknown as Record<string, unknown>[],
    total,
    limit: query.limit,
    skip: query.skip,
  };
}

export interface AttendanceSummaryResult {
  date: string;
  mealType: string;
  messHallId: string;
  totalPresent: number;
  expectedHeadcount: number;
  turnoutPercentage: number;
  methodBreakdown: {
    qr: number;
    rfid: number;
    manual: number;
  };
  offlineSyncedCount: number;
}

export async function getAttendanceSummary(
  session: Session,
  query: AttendanceSummaryQuery,
): Promise<AttendanceSummaryResult> {
  await connectDb();

  const filter: Record<string, unknown> = {
    institutionId: session.institutionId,
    serviceDate: query.date,
    mealType: query.mealType,
  };
  if (query.messHallId !== 'all') {
    filter.messHallId = query.messHallId;
  }

  const records = await AttendanceModel.find(filter).lean();

  const totalPresent = records.length;
  let qrCount = 0;
  let rfidCount = 0;
  let manualCount = 0;
  let offlineSyncedCount = 0;

  for (const r of records) {
    if (r.method === 'qr') qrCount++;
    else if (r.method === 'rfid') rfidCount++;
    else manualCount++;

    if (r.offlineSynced) offlineSyncedCount++;
  }

  // Find enrolled students for baseline expected count
  const studentCount = await StudentModel.countDocuments({
    institutionId: session.institutionId,
    ...(query.messHallId !== 'all' ? { messHallId: query.messHallId } : {}),
    mealPlanStatus: 'active',
  });

  const expectedHeadcount = studentCount > 0 ? studentCount : 350;
  const turnoutPercentage = expectedHeadcount > 0 ? Math.round((totalPresent / expectedHeadcount) * 100) : 0;

  return {
    date: query.date,
    mealType: query.mealType,
    messHallId: query.messHallId,
    totalPresent,
    expectedHeadcount,
    turnoutPercentage,
    methodBreakdown: {
      qr: qrCount,
      rfid: rfidCount,
      manual: manualCount,
    },
    offlineSyncedCount,
  };
}
