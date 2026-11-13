import { z } from 'zod';
import { objectIdSchema } from '@/lib/validation';
import { mealTypeSchema } from '@/modules/planning/plan.schema';

export const wasteTypeSchema = z.enum([
  'kitchen_prep',
  'unserved_leftover',
  'student_plate_waste',
  'spoilage',
]);

export const wasteReasonCodeSchema = z.enum([
  'over_preparation',
  'low_attendance_exam',
  'low_attendance_holiday',
  'rain_disruption',
  'burning_cooking_error',
  'spoilage_power_cut',
  'quality_rejection',
  'plate_uneaten',
]);

export const disposalMethodSchema = z.enum([
  'compost',
  'biogas',
  'piggery_feed',
  'municipal_waste',
]);

export const recordWasteSchema = z.object({
  messHallId: z.string().min(1),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  mealType: mealTypeSchema,
  dishId: objectIdSchema.optional(),
  wasteType: wasteTypeSchema,
  quantityKg: z.number().min(0.01),
  financialLossPaise: z.number().int().min(0),
  reasonCode: wasteReasonCodeSchema,
  disposalMethod: disposalMethodSchema.optional().default('compost'),
  notes: z.string().max(500).optional(),
});

export const listWasteQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format').optional(),
  messHallId: z.string().optional(),
  mealType: mealTypeSchema.optional(),
  wasteType: wasteTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
});

export type RecordWasteInput = z.infer<typeof recordWasteSchema>;
export type ListWasteQuery = z.infer<typeof listWasteQuerySchema>;
