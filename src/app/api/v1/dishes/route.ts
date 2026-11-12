import { protectedRoute, parse, created } from '@/lib/http';
import { createDishSchema, listDishQuery } from '@/modules/menus/dish.schema';
import { createDish, listDishes } from '@/modules/menus';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('dish:read', async ({ req, session }) => {
  const q = parse(listDishQuery, Object.fromEntries(req.nextUrl.searchParams));
  return listDishes(session, { limit: q.limit, skip: q.skip, active: q.active === undefined ? undefined : q.active === 'true' });
});

export const POST = protectedRoute('dish:write', async ({ req, session, ip }) => {
  const body = parse(createDishSchema, await req.json());
  return created(await createDish(session, body, ip));
});
