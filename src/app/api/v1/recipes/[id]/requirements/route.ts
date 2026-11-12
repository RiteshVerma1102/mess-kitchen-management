import { protectedRoute, parse } from '@/lib/http';
import { objectIdSchema } from '@/lib/validation';
import { calculateRequirementsQuery } from '@/modules/menus/recipe.schema';
import { calculateIngredientRequirements } from '@/modules/menus/recipe.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute<{ id: string }>('dish:read', async ({ req, params, session }) => {
  const id = parse(objectIdSchema, params.id);
  const query = parse(calculateRequirementsQuery, Object.fromEntries(req.nextUrl.searchParams));
  return calculateIngredientRequirements(session, id, query.portions);
});
