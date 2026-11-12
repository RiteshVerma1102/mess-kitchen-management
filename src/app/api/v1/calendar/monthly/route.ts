import { protectedRoute, parse } from '@/lib/http';
import { monthlyCalendarQuery } from '@/modules/calendar/calendar.schema';
import { getMonthlyCalendar } from '@/modules/calendar/calendar.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('calendar:read', async ({ req, session }) => {
  const query = parse(monthlyCalendarQuery, Object.fromEntries(req.nextUrl.searchParams));
  return getMonthlyCalendar(session, query);
});
