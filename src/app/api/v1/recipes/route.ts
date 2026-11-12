import { protectedRoute, parse, created } from '@/lib/http';
import { createRecipeSchema, listRecipeQuery } from '@/modules/menus/recipe.schema';
import { createRecipe, listRecipes } from '@/modules/menus/recipe.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('dish:read', async ({ req, session }) => {
  const query = parse(listRecipeQuery, Object.fromEntries(req.nextUrl.searchParams));
  return listRecipes(session, query);
});

export const POST = protectedRoute('recipe:write', async ({ req, session, ip }) => {
  const body = parse(createRecipeSchema, await req.json());
  return created(await createRecipe(session, body, ip));
});
