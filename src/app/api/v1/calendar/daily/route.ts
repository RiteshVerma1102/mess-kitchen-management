import { protectedRoute, parse } from '@/lib/http';
import { dailyCalendarQuery } from '@/modules/calendar/calendar.schema';
import { getDailySchedule } from '@/modules/calendar/calendar.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('calendar:read', async ({ req, session }) => {
  const query = parse(dailyCalendarQuery, Object.fromEntries(req.nextUrl.searchParams));
  return getDailySchedule(session, query.date, query.messHallId);
});
