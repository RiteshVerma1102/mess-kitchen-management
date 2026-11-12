import { z } from 'zod';
import { objectIdSchema } from '@/lib/validation';

export const recipeItemInputSchema = z.object({
  ingredientId: objectIdSchema,
  quantity: z.number().positive('Quantity must be greater than zero'),
  unit: z.enum(['kg', 'g', 'l', 'ml', 'piece', 'packet', 'dozen']),
  wastePercentage: z.number().min(0).max(100).default(0),
  preparationNotes: z.string().trim().max(200).optional(),
});
export type RecipeItemInput = z.infer<typeof recipeItemInputSchema>;

export const createRecipeSchema = z.object({
  dishId: objectIdSchema,
  version: z.number().int().min(1).default(1),
  yieldPortions: z.number().int().min(1, 'Yield portions must be at least 1').default(100),
  ingredients: z.array(recipeItemInputSchema).min(1, 'At least one ingredient is required'),
  instructions: z.string().trim().max(2000).optional(),
  cookingTimeMinutes: z.number().int().min(0).optional(),
});
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;

export const updateRecipeSchema = z.object({
  version: z.number().int().min(1).optional(),
  yieldPortions: z.number().int().min(1).optional(),
  ingredients: z.array(recipeItemInputSchema).min(1).optional(),
  instructions: z.string().trim().max(2000).optional(),
  cookingTimeMinutes: z.number().int().min(0).optional(),
});
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;

export const listRecipeQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
  dishId: objectIdSchema.optional(),
});
export type ListRecipeQuery = z.infer<typeof listRecipeQuery>;

export const calculateRequirementsQuery = z.object({
  portions: z.coerce.number().int().min(1, 'Portions must be at least 1'),
});
export type CalculateRequirementsQuery = z.infer<typeof calculateRequirementsQuery>;
