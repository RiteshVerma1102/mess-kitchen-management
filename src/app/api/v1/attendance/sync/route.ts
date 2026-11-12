import { protectedRoute, parse } from '@/lib/http';
import { syncAttendanceSchema } from '@/modules/attendance/attendance.schema';
import { syncOfflineAttendance } from '@/modules/attendance/attendance.service';

export const dynamic = 'force-dynamic';

export const POST = protectedRoute('attendance:create', async ({ req, session, ip }) => {
  const body = parse(syncAttendanceSchema, await req.json());
  return syncOfflineAttendance(session, body.records, ip);
});
