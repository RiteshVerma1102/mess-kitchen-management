import { protectedRoute, parse } from '@/lib/http';
import { attendanceSummaryQuery } from '@/modules/attendance/attendance.schema';
import { getAttendanceSummary } from '@/modules/attendance/attendance.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('attendance:read', async ({ req, session }) => {
  const query = parse(attendanceSummaryQuery, Object.fromEntries(req.nextUrl.searchParams));
  return getAttendanceSummary(session, query);
});
