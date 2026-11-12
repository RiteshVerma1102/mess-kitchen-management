import { z } from 'zod';
import { objectIdSchema } from '@/lib/validation';
import { mealTypeSchema } from '@/modules/planning/plan.schema';

export const recordActualSchema = z.object({
  messHallId: z.string().min(1),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  mealType: mealTypeSchema,
  dishId: objectIdSchema,
  quantityPrepared: z.number().min(0),
  quantityServed: z.number().min(0),
  quantityLeftover: z.number().min(0),
  quantitySpoiled: z.number().min(0).optional().default(0),
  unit: z.enum(['portion', 'kg']).optional().default('portion'),
  notes: z.string().max(500).optional(),
  ingredientConsumption: z
    .array(
      z.object({
        ingredientId: objectIdSchema,
        ingredientName: z.string(),
        quantityConsumed: z.number().min(0),
        unit: z.string(),
      }),
    )
    .optional(),
});

export const listActualsQuerySchema = z.object({
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  messHallId: z.string().optional(),
  mealType: mealTypeSchema.optional(),
});

export type RecordActualInput = z.infer<typeof recordActualSchema>;
export type ListActualsQuery = z.infer<typeof listActualsQuerySchema>;
