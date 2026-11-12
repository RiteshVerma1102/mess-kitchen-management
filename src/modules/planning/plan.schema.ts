import { z } from 'zod';
import { objectIdSchema } from '@/lib/validation';

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'snacks', 'dinner']);

export const generatePlanSchema = z.object({
  messHallId: z.string().min(1),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  mealType: mealTypeSchema,
  bufferPercentage: z.number().min(0).max(25).optional().default(5),
});

export const updatePlanSchema = z.object({
  status: z.enum(['draft', 'approved', 'in_kitchen', 'completed']).optional(),
  bufferPercentage: z.number().min(0).max(25).optional(),
  plannedPortions: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const listPlansQuerySchema = z.object({
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  messHallId: z.string().min(1).optional(),
  mealType: mealTypeSchema.optional(),
  status: z.enum(['draft', 'approved', 'in_kitchen', 'completed']).optional(),
});

export const createManualIndentSchema = z.object({
  messHallId: z.string().min(1),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  supplierId: objectIdSchema.optional(),
  notes: z.string().max(500).optional(),
  items: z.array(
    z.object({
      ingredientId: objectIdSchema,
      requestedQuantity: z.number().positive(),
      notes: z.string().optional(),
    }),
  ).min(1, 'At least one ingredient is required'),
});

export const generateIndentFromShortagesSchema = z.object({
  messHallId: z.string().min(1),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  supplierId: objectIdSchema.optional(),
  notes: z.string().max(500).optional(),
});

export const updateIndentStatusSchema = z.object({
  status: z.enum(['draft', 'submitted', 'approved', 'fulfilled', 'cancelled']),
  notes: z.string().max(500).optional(),
  items: z.array(
    z.object({
      ingredientId: objectIdSchema,
      issuedQuantity: z.number().min(0),
    }),
  ).optional(),
});

export const listIndentsQuerySchema = z.object({
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format').optional(),
  messHallId: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'fulfilled', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  skip: z.coerce.number().int().min(0).optional().default(0),
});

export const stockAdjustmentSchema = z.object({
  ingredientId: objectIdSchema,
  quantityChange: z.number(), // positive to add stock, negative to deduct
  movementType: z.enum(['inward_indent', 'outward_kitchen', 'adjustment', 'spoilage_writeoff']),
  notes: z.string().min(1).max(250),
  referenceId: z.string().optional(),
});

export type GeneratePlanInput = z.infer<typeof generatePlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type ListPlansQuery = z.infer<typeof listPlansQuerySchema>;
export type CreateManualIndentInput = z.infer<typeof createManualIndentSchema>;
export type GenerateIndentFromShortagesInput = z.infer<typeof generateIndentFromShortagesSchema>;
export type UpdateIndentStatusInput = z.infer<typeof updateIndentStatusSchema>;
export type ListIndentsQuery = z.infer<typeof listIndentsQuerySchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
