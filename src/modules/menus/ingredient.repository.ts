import { tenantRepo } from '@/core/tenant/repository';
import { IngredientModel, type IIngredient } from './ingredient.model';

export const ingredientRepository = (institutionId: string) =>
  tenantRepo<IIngredient>(IngredientModel, institutionId);
