import { protectedRoute, parse } from '@/lib/http';
import { getMenuByDateQuery } from '@/modules/menus/menu.schema';
import { getMenuByDate } from '@/modules/menus/menu.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('menu:read', async ({ req, session }) => {
  const query = parse(getMenuByDateQuery, Object.fromEntries(req.nextUrl.searchParams));
  return getMenuByDate(session, query.date, query.messHallId);
});
