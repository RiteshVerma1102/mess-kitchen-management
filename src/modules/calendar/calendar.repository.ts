import { tenantRepo } from '@/core/tenant/repository';
import { CalendarEventModel, type ICalendarEvent } from './calendar.model';

export const calendarRepository = (institutionId: string) =>
  tenantRepo<ICalendarEvent>(CalendarEventModel, institutionId);
