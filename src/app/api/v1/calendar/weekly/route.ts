import { protectedRoute, parse } from '@/lib/http';
import { weeklyCalendarQuery } from '@/modules/calendar/calendar.schema';
import { getWeeklySchedule } from '@/modules/calendar/calendar.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('calendar:read', async ({ req, session }) => {
  const query = parse(weeklyCalendarQuery, Object.fromEntries(req.nextUrl.searchParams));
  return getWeeklySchedule(session, query.startDate, query.messHallId);
});
