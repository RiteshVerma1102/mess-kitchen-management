import { protectedRoute, parse, created } from '@/lib/http';
import { markAttendanceSchema, listAttendanceQuery } from '@/modules/attendance/attendance.schema';
import { markAttendance, listAttendance } from '@/modules/attendance/attendance.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('attendance:read', async ({ req, session }) => {
  const query = parse(listAttendanceQuery, Object.fromEntries(req.nextUrl.searchParams));
  return listAttendance(session, query);
});

export const POST = protectedRoute('attendance:create', async ({ req, session, ip }) => {
  const body = parse(markAttendanceSchema, await req.json());
  return created(await markAttendance(session, body, ip));
});
