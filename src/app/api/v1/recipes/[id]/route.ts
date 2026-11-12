import { protectedRoute, parse } from '@/lib/http';
import { objectIdSchema } from '@/lib/validation';
import { updateRecipeSchema } from '@/modules/menus/recipe.schema';
import { getRecipeById, updateRecipe, deleteRecipe } from '@/modules/menus/recipe.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute<{ id: string }>('dish:read', async ({ params, session }) => {
  const id = parse(objectIdSchema, params.id);
  return getRecipeById(session, id);
});

export const PATCH = protectedRoute<{ id: string }>('recipe:write', async ({ req, params, session, ip }) => {
  const id = parse(objectIdSchema, params.id);
  const body = parse(updateRecipeSchema, await req.json());
  return updateRecipe(session, id, body, ip);
});

export const DELETE = protectedRoute<{ id: string }>('recipe:write', async ({ params, session, ip }) => {
  const id = parse(objectIdSchema, params.id);
  return deleteRecipe(session, id, ip);
});
