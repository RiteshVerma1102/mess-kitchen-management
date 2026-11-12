import { protectedRoute, parse } from '@/lib/http';
import { objectIdSchema } from '@/lib/validation';
import { updateCalendarEventSchema } from '@/modules/calendar/calendar.schema';
import { updateCalendarEvent, deleteCalendarEvent } from '@/modules/calendar/calendar.service';

export const dynamic = 'force-dynamic';

export const PATCH = protectedRoute<{ id: string }>('calendar:write', async ({ req, params, session, ip }) => {
  const id = parse(objectIdSchema, params.id);
  const body = parse(updateCalendarEventSchema, await req.json());
  return updateCalendarEvent(session, id, body, ip);
});

export const DELETE = protectedRoute<{ id: string }>('calendar:write', async ({ params, session, ip }) => {
  const id = parse(objectIdSchema, params.id);
  return deleteCalendarEvent(session, id, ip);
});
