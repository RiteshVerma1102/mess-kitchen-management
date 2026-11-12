import { z } from 'zod';

export const createDishSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(['main', 'side', 'bread', 'rice', 'dessert', 'beverage', 'snack']),
  portionGrams: z.number().positive(),
  costPerPortionPaise: z.number().int().nonnegative(),
  vegetarian: z.boolean().default(true),
  active: z.boolean().default(true),
});
export type CreateDishInput = z.infer<typeof createDishSchema>;

export const listDishQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
  active: z.enum(['true', 'false']).optional(),
});
