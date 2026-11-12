import { tenantRepo } from '@/core/tenant/repository';
import { AttendanceModel, type IAttendance } from './attendance.model';

export const attendanceRepository = (institutionId: string) =>
  tenantRepo<IAttendance>(AttendanceModel, institutionId);
