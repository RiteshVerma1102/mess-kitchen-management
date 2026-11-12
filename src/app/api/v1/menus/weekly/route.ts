import { z } from 'zod';
import { protectedRoute, parse } from '@/lib/http';
import { getWeeklyMenuCalendar } from '@/modules/menus/menu.service';

export const dynamic = 'force-dynamic';

const weeklyQuery = z.object({
  messHallId: z.string().trim().optional().default('all'),
});

export const GET = protectedRoute('menu:read', async ({ req, session }) => {
  const query = parse(weeklyQuery, Object.fromEntries(req.nextUrl.searchParams));
  return getWeeklyMenuCalendar(session, query.messHallId);
});
