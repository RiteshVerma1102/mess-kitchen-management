import { protectedRoute, parse } from '@/lib/http';
import { objectIdSchema } from '@/lib/validation';
import { getRecipeByDishId } from '@/modules/menus/recipe.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute<{ dishId: string }>('dish:read', async ({ params, session }) => {
  const dishId = parse(objectIdSchema, params.dishId);
  return getRecipeByDishId(session, dishId);
});
