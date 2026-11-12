import { z } from 'zod';
import { objectIdSchema } from '@/lib/validation';

export const mealDishItemInputSchema = z.object({
  dishId: objectIdSchema,
  portionGrams: z.number().positive('Portion grams must be positive'),
  mandatory: z.boolean().default(true),
  notes: z.string().trim().max(200).optional(),
});
export type MealDishItemInput = z.infer<typeof mealDishItemInputSchema>;

export const mealsMapInputSchema = z.object({
  breakfast: z.array(mealDishItemInputSchema).default([]),
  lunch: z.array(mealDishItemInputSchema).default([]),
  snacks: z.array(mealDishItemInputSchema).default([]),
  dinner: z.array(mealDishItemInputSchema).default([]),
});
export type MealsMapInput = z.infer<typeof mealsMapInputSchema>;

export const createMenuSchema = z.object({
  name: z.string().trim().min(2, 'Menu name must be at least 2 characters').max(150),
  cycleType: z.enum(['weekly', 'fortnightly', 'monthly', 'special_event']).default('weekly'),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  messHallId: z.string().trim().default('all'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  meals: mealsMapInputSchema.default({
    breakfast: [],
    lunch: [],
    snacks: [],
    dinner: [],
  }),
  specialNotice: z.string().trim().max(500).optional(),
});
export type CreateMenuInput = z.infer<typeof createMenuSchema>;

export const updateMenuSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  cycleType: z.enum(['weekly', 'fortnightly', 'monthly', 'special_event']).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  messHallId: z.string().trim().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  meals: mealsMapInputSchema.optional(),
  specialNotice: z.string().trim().max(500).optional(),
});
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;

export const listMenuQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  cycleType: z.enum(['weekly', 'fortnightly', 'monthly', 'special_event']).optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  effectiveDate: z.string().optional(),
  messHallId: z.string().optional(),
  search: z.string().trim().optional(),
});
export type ListMenuQuery = z.infer<typeof listMenuQuery>;

export const getMenuByDateQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  messHallId: z.string().trim().optional().default('all'),
});
