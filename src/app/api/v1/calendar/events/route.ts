import { protectedRoute, parse, created } from '@/lib/http';
import { createCalendarEventSchema, listEventsQuery } from '@/modules/calendar/calendar.schema';
import { createCalendarEvent, listCalendarEvents } from '@/modules/calendar/calendar.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('calendar:read', async ({ req, session }) => {
  const query = parse(listEventsQuery, Object.fromEntries(req.nextUrl.searchParams));
  return listCalendarEvents(session, query);
});

export const POST = protectedRoute('calendar:write', async ({ req, session, ip }) => {
  const body = parse(createCalendarEventSchema, await req.json());
  return created(await createCalendarEvent(session, body, ip));
});
