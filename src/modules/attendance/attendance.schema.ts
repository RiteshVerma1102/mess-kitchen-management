import { z } from 'zod';

export const mealTypeEnum = z.enum(['breakfast', 'lunch', 'snacks', 'dinner']);
export const scanMethodEnum = z.enum(['qr', 'rfid', 'manual']);

export const markAttendanceSchema = z.object({
  studentRef: z.string().trim().min(1, 'Student Roll Number or ID is required'),
  messHallId: z.string().trim().min(1, 'Mess hall ID is required'),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  mealType: mealTypeEnum,
  method: scanMethodEnum.default('manual'),
  clientUuid: z.string().uuid('clientUuid must be a valid UUID v4'),
  deviceId: z.string().trim().min(1).default('kitchen_tablet_01'),
  clientTimestamp: z.string().optional(),
});
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export const syncAttendanceSchema = z.object({
  records: z.array(markAttendanceSchema).min(1, 'Batch must contain at least 1 record').max(500, 'Batch limit is 500 records'),
});
export type SyncAttendanceInput = z.infer<typeof syncAttendanceSchema>;

export const listAttendanceQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mealType: mealTypeEnum.optional(),
  messHallId: z.string().optional(),
  studentRef: z.string().optional(),
});
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuery>;

export const attendanceSummaryQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().slice(0, 10)),
  mealType: mealTypeEnum.default('lunch'),
  messHallId: z.string().default('all'),
});
export type AttendanceSummaryQuery = z.infer<typeof attendanceSummaryQuery>;
