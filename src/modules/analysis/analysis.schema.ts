import { z } from 'zod';
import { mealTypeSchema } from '@/modules/planning/plan.schema';

export const analyticsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  messHallId: z.string().optional(),
  mealType: mealTypeSchema.optional(),
});

export const reportExportQuerySchema = z.object({
  type: z.enum(['daily_operations', 'waste_log', 'cost_procurement', 'forecast_accuracy']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  messHallId: z.string().optional(),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type ReportExportQuery = z.infer<typeof reportExportQuerySchema>;
