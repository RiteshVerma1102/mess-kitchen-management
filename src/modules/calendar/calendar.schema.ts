import { z } from 'zod';

export const mealTypesList = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;

export const createCalendarEventSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  title: z.string().trim().min(2, 'Event title must be at least 2 characters').max(150),
  eventType: z.enum(['holiday', 'exam', 'fest', 'vacation', 'sports', 'regular', 'special_meal']),
  impactMultiplier: z.number().min(0).max(3).default(1.0),
  affectedMeals: z.array(z.enum(mealTypesList)).default(['breakfast', 'lunch', 'snacks', 'dinner']),
  messHallId: z.string().trim().default('all'),
  description: z.string().trim().max(500).optional(),
});
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

export const updateCalendarEventSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  title: z.string().trim().min(2).max(150).optional(),
  eventType: z.enum(['holiday', 'exam', 'fest', 'vacation', 'sports', 'regular', 'special_meal']).optional(),
  impactMultiplier: z.number().min(0).max(3).optional(),
  affectedMeals: z.array(z.enum(mealTypesList)).optional(),
  messHallId: z.string().trim().optional(),
  description: z.string().trim().max(500).optional(),
});
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;

export const dailyCalendarQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').default(() => new Date().toISOString().slice(0, 10)),
  messHallId: z.string().trim().optional().default('all'),
});

export const weeklyCalendarQuery = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  messHallId: z.string().trim().optional().default('all'),
});

export const monthlyCalendarQuery = z.object({
  year: z.coerce.number().int().min(2020).max(2035).default(() => new Date().getUTCFullYear()),
  month: z.coerce.number().int().min(1).max(12).default(() => new Date().getUTCMonth() + 1),
  messHallId: z.string().trim().optional().default('all'),
});
export type MonthlyCalendarQuery = z.infer<typeof monthlyCalendarQuery>;

export const listEventsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  eventType: z.enum(['holiday', 'exam', 'fest', 'vacation', 'sports', 'regular', 'special_meal']).optional(),
});
export type ListEventsQuery = z.infer<typeof listEventsQuery>;
