import { connectDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { writeAudit } from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import { getMenuByDate } from '@/modules/menus/menu.service';
import { CalendarEventModel, type CalendarEventDoc, type ICalendarEvent } from './calendar.model';
import { calendarRepository } from './calendar.repository';
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  MonthlyCalendarQuery,
  ListEventsQuery,
} from './calendar.schema';

export async function createCalendarEvent(
  session: Session,
  input: CreateCalendarEventInput,
  ip?: string,
): Promise<CalendarEventDoc> {
  await connectDb();
  const repo = calendarRepository(session.institutionId);

  const created = await repo.create({
    date: input.date,
    title: input.title,
    eventType: input.eventType,
    impactMultiplier: input.impactMultiplier,
    affectedMeals: input.affectedMeals,
    messHallId: input.messHallId,
    description: input.description,
    isSynthetic: false,
  });

  const event = created as unknown as CalendarEventDoc;

  await writeAudit({
    session,
    ip,
    action: 'calendar.event.create',
    target: { type: 'CalendarEvent', id: event._id.toString() },
    after: { title: event.title, date: event.date, eventType: event.eventType },
  });

  return event;
}

export async function updateCalendarEvent(
  session: Session,
  eventId: string,
  input: UpdateCalendarEventInput,
  ip?: string,
): Promise<CalendarEventDoc> {
  await connectDb();
  const repo = calendarRepository(session.institutionId);

  const existing = await repo.get(eventId);
  if (!existing) {
    throw new NotFoundError('Calendar event not found');
  }

  const updateData: Partial<ICalendarEvent> = {};
  if (input.date !== undefined) updateData.date = input.date;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.eventType !== undefined) updateData.eventType = input.eventType;
  if (input.impactMultiplier !== undefined) updateData.impactMultiplier = input.impactMultiplier;
  if (input.affectedMeals !== undefined) updateData.affectedMeals = input.affectedMeals;
  if (input.messHallId !== undefined) updateData.messHallId = input.messHallId;
  if (input.description !== undefined) updateData.description = input.description;

  const updated = await repo.update(eventId, updateData);
  if (!updated) {
    throw new NotFoundError('Calendar event not found after update');
  }

  const event = updated as unknown as CalendarEventDoc;

  await writeAudit({
    session,
    ip,
    action: 'calendar.event.update',
    target: { type: 'CalendarEvent', id: eventId },
    before: { title: existing.title, date: existing.date },
    after: { title: event.title, date: event.date },
  });

  return event;
}

export async function deleteCalendarEvent(
  session: Session,
  eventId: string,
  ip?: string,
): Promise<{ success: boolean; id: string }> {
  await connectDb();
  const repo = calendarRepository(session.institutionId);

  const existing = await repo.get(eventId);
  if (!existing) {
    throw new NotFoundError('Calendar event not found');
  }

  await repo.remove(eventId);

  await writeAudit({
    session,
    ip,
    action: 'calendar.event.delete',
    target: { type: 'CalendarEvent', id: eventId },
    before: { title: existing.title, date: existing.date },
  });

  return { success: true, id: eventId };
}

export async function listCalendarEvents(
  session: Session,
  query: ListEventsQuery,
): Promise<{ events: CalendarEventDoc[]; total: number; limit: number; skip: number }> {
  await connectDb();
  const repo = calendarRepository(session.institutionId);

  const filter: Record<string, unknown> = {};
  if (query.eventType) filter.eventType = query.eventType;
  if (query.startDate && query.endDate) {
    filter.date = { $gte: query.startDate, $lte: query.endDate };
  } else if (query.startDate) {
    filter.date = { $gte: query.startDate };
  } else if (query.endDate) {
    filter.date = { $lte: query.endDate };
  }

  const [events, total] = await Promise.all([
    repo.list(filter, { limit: query.limit, skip: query.skip, sort: { date: 1 } }),
    repo.count(filter),
  ]);

  return {
    events: events as unknown as CalendarEventDoc[],
    total,
    limit: query.limit,
    skip: query.skip,
  };
}

export interface DailyScheduleResult {
  date: string;
  dayOfWeek: number;
  dayName: string;
  isHoliday: boolean;
  impactMultiplier: number;
  events: CalendarEventDoc[];
  menuAvailable: boolean;
  menu: Record<string, unknown> | null;
  mealTimings: {
    breakfast: string;
    lunch: string;
    snacks: string;
    dinner: string;
  };
}

export async function getDailySchedule(
  session: Session,
  dateStr: string,
  messHallId = 'all',
): Promise<DailyScheduleResult> {
  await connectDb();

  const dateObj = new Date(`${dateStr}T12:00:00Z`);
  const dayOfWeek = dateObj.getUTCDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // 1. Fetch events on that date
  const events = await CalendarEventModel.find({
    institutionId: session.institutionId,
    date: dateStr,
    ...(messHallId !== 'all' ? { $or: [{ messHallId }, { messHallId: 'all' }] } : {}),
  }).lean<CalendarEventDoc[]>();

  const isHoliday = events.some((e) => e.eventType === 'holiday' || e.eventType === 'vacation');

  // Combined multiplier (lowest if holiday, product otherwise)
  let impactMultiplier = 1.0;
  for (const e of events) {
    if (e.impactMultiplier !== undefined) {
      impactMultiplier = Math.min(impactMultiplier, e.impactMultiplier);
    }
  }

  // 2. Fetch menu for that date
  const menu = await getMenuByDate(session, dateStr, messHallId);

  return {
    date: dateStr,
    dayOfWeek,
    dayName: dayNames[dayOfWeek],
    isHoliday,
    impactMultiplier,
    events,
    menuAvailable: Boolean(menu),
    menu,
    mealTimings: {
      breakfast: '07:30 - 09:30',
      lunch: '12:00 - 14:15',
      snacks: '17:00 - 18:00',
      dinner: '19:45 - 21:45',
    },
  };
}

export async function getWeeklySchedule(
  session: Session,
  startDateStr?: string,
  messHallId = 'all',
): Promise<DailyScheduleResult[]> {
  const start = startDateStr ? new Date(`${startDateStr}T12:00:00Z`) : new Date();

  // Find beginning of current week (Monday or provided date)
  const days: DailyScheduleResult[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(start);
    cur.setUTCDate(start.getUTCDate() + i);
    const dateStr = cur.toISOString().slice(0, 10);
    const daySchedule = await getDailySchedule(session, dateStr, messHallId);
    days.push(daySchedule);
  }

  return days;
}

export interface MonthDaySummary {
  date: string;
  dayOfMonth: number;
  dayOfWeek: number;
  eventsCount: number;
  eventTypes: string[];
  isHoliday: boolean;
  menuAvailable: boolean;
}

export async function getMonthlyCalendar(
  session: Session,
  query: MonthlyCalendarQuery,
): Promise<{
  year: number;
  month: number;
  totalDays: number;
  days: MonthDaySummary[];
  events: CalendarEventDoc[];
}> {
  await connectDb();

  const { year, month, messHallId } = query;
  const daysInMonth = new Date(year, month, 0).getDate();

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  const events = await CalendarEventModel.find({
    institutionId: session.institutionId,
    date: { $gte: startDate, $lte: endDate },
    ...(messHallId !== 'all' ? { $or: [{ messHallId }, { messHallId: 'all' }] } : {}),
  }).sort({ date: 1 }).lean<CalendarEventDoc[]>();

  const eventMap = new Map<string, CalendarEventDoc[]>();
  for (const e of events) {
    const list = eventMap.get(e.date) || [];
    list.push(e);
    eventMap.set(e.date, list);
  }

  const days: MonthDaySummary[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(`${dateStr}T12:00:00Z`);
    const dayEvents = eventMap.get(dateStr) || [];

    const isHoliday = dayEvents.some((e) => e.eventType === 'holiday' || e.eventType === 'vacation');

    days.push({
      date: dateStr,
      dayOfMonth: d,
      dayOfWeek: dateObj.getUTCDay(),
      eventsCount: dayEvents.length,
      eventTypes: Array.from(new Set(dayEvents.map((e) => e.eventType))),
      isHoliday,
      menuAvailable: true, // weekly cyclic menus are always available by default
    });
  }

  return {
    year,
    month,
    totalDays: daysInMonth,
    days,
    events,
  };
}
