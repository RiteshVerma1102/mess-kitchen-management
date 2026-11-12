import { protectedRoute, parse, created } from '@/lib/http';
import { createMenuSchema, listMenuQuery } from '@/modules/menus/menu.schema';
import { createMenu, listMenus } from '@/modules/menus/menu.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('menu:read', async ({ req, session }) => {
  const query = parse(listMenuQuery, Object.fromEntries(req.nextUrl.searchParams));
  return listMenus(session, query);
});

export const POST = protectedRoute('menu:write', async ({ req, session, ip }) => {
  const body = parse(createMenuSchema, await req.json());
  return created(await createMenu(session, body, ip));
});
