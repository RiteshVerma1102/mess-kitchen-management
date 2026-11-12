import { z } from 'zod';
import { objectIdSchema } from '@/lib/validation';

export const mealTypeEnum = z.enum(['breakfast', 'lunch', 'snacks', 'dinner']);

export const dailyForecastQuery = z.object({
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .default(() => new Date().toISOString().slice(0, 10)),
  messHallId: z.string().trim().default('hall_a'),
});
export type DailyForecastQuery = z.infer<typeof dailyForecastQuery>;

export const ingredientForecastQuery = z.object({
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .default(() => new Date().toISOString().slice(0, 10)),
  messHallId: z.string().trim().default('hall_a'),
  mealType: mealTypeEnum.default('lunch'),
});
export type IngredientForecastQuery = z.infer<typeof ingredientForecastQuery>;

export const forecastHistoryQuery = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  messHallId: z.string().trim().default('hall_a'),
  mealType: mealTypeEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type ForecastHistoryQuery = z.infer<typeof forecastHistoryQuery>;

export const overrideForecastSchema = z.object({
  forecastId: objectIdSchema,
  overrideCount: z.number().int().min(1, 'Portions must be at least 1'),
  reason: z.string().trim().min(3, 'Override reason must be at least 3 characters').max(300),
});
export type OverrideForecastInput = z.infer<typeof overrideForecastSchema>;
