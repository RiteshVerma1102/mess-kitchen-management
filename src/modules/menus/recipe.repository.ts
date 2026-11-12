import { tenantRepo } from '@/core/tenant/repository';
import { RecipeModel, type IRecipe } from './recipe.model';

export const recipeRepository = (institutionId: string) =>
  tenantRepo<IRecipe>(RecipeModel, institutionId);
