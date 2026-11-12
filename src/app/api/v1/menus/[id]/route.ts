import { protectedRoute, parse } from '@/lib/http';
import { objectIdSchema } from '@/lib/validation';
import { updateMenuSchema } from '@/modules/menus/menu.schema';
import { getMenuById, updateMenu, deleteMenu } from '@/modules/menus/menu.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute<{ id: string }>('menu:read', async ({ params, session }) => {
  const id = parse(objectIdSchema, params.id);
  return getMenuById(session, id);
});

export const PATCH = protectedRoute<{ id: string }>('menu:write', async ({ req, params, session, ip }) => {
  const id = parse(objectIdSchema, params.id);
  const body = parse(updateMenuSchema, await req.json());
  return updateMenu(session, id, body, ip);
});

export const DELETE = protectedRoute<{ id: string }>('menu:write', async ({ params, session, ip }) => {
  const id = parse(objectIdSchema, params.id);
  return deleteMenu(session, id, ip);
});
