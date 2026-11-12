'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';

interface MonthDaySummary {
  date: string;
  dayOfMonth: number;
  dayOfWeek: number;
  eventsCount: number;
  eventTypes: string[];
  isHoliday: boolean;
  menuAvailable: boolean;
}

interface CalendarEvent {
  _id: string;
  date: string;
  title: string;
  eventType: 'holiday' | 'exam' | 'fest' | 'vacation' | 'sports' | 'regular' | 'special_meal';
  impactMultiplier: number;
  affectedMeals: string[];
  description?: string;
}

interface MonthlyData {
  year: number;
  month: number;
  totalDays: number;
  days: MonthDaySummary[];
  events: CalendarEvent[];
}

export default function CalendarPage() {
  const { success, error } = useToast();

  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1); // 1-12
  const [data, setData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(true);

  // Day inspection modal
  const [selectedDay, setSelectedDay] = useState<MonthDaySummary | null>(null);

  // Add event modal
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<'holiday' | 'exam' | 'fest' | 'vacation' | 'sports' | 'regular' | 'special_meal'>('holiday');
  const [eventMultiplier, setEventMultiplier] = useState(0.3);
  const [eventDescription, setEventDescription] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);

  const loadMonth = useCallback(async (y: number, m: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/calendar/monthly?year=${y}&month=${m}`);
      if (res.ok) {
        const body = await res.json();
        setData(body.data);
      } else {
        error('Error', 'Failed to load calendar events');
      }
    } catch {
      error('Network Error', 'Could not reach calendar service');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadMonth(year, month);
  }, [year, month, loadMonth]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setYear(today.getUTCFullYear());
    setMonth(today.getUTCMonth() + 1);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEvent(true);
    try {
      const payload = {
        date: eventDate,
        title: eventTitle,
        eventType,
        impactMultiplier: eventMultiplier,
        affectedMeals: ['breakfast', 'lunch', 'snacks', 'dinner'],
        description: eventDescription || undefined,
      };

      const res = await fetch('/api/v1/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        error('Failed to create event', body?.error?.message ?? 'Unknown error');
        setSavingEvent(false);
        return;
      }

      success('Event Registered', `"${eventTitle}" added to university schedule`);
      setIsAddEventOpen(false);
      setEventTitle('');
      setEventDescription('');
      loadMonth(year, month);
    } catch {
      error('Network Error', 'Failed to communicate with calendar API');
    } finally {
      setSavingEvent(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const firstDayOfWeek = data?.days?.[0]?.dayOfWeek ?? 0;
  const paddingDays = Array.from({ length: firstDayOfWeek });

  const getEventsForDay = (dateStr: string) => {
    return data?.events.filter((e) => e.date === dateStr) || [];
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {monthNames[month - 1]} {year}
          </h1>
          <p className="text-xs text-ink/70 mt-1">
            Academic calendar, holidays, exam schedules & student presence impact.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Next →
          </button>
          <button
            type="button"
            onClick={() => setIsAddEventOpen(true)}
            className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:opacity-95"
          >
            <span>+</span>
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-line bg-paper shadow-sm overflow-hidden">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-line bg-stone-50 dark:bg-stone-900/60 text-center text-[11px] font-bold text-ink/70 uppercase tracking-wider py-2">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days cells */}
        {loading ? (
          <div className="p-16 text-center text-xs text-ink/60 animate-pulse">
            Loading monthly calendar...
          </div>
        ) : (
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-line">
            {/* Empty padding for days before the 1st */}
            {paddingDays.map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[90px] bg-stone-100/40 dark:bg-stone-900/20 p-2" />
            ))}

            {/* Days in month */}
            {data?.days.map((day) => {
              const dayEvents = getEventsForDay(day.date);
              const isToday =
                new Date().toISOString().slice(0, 10) === day.date;

              return (
                <div
                  key={day.date}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[90px] p-2 cursor-pointer transition hover:bg-stone-50 dark:hover:bg-stone-900/50 flex flex-col justify-between ${
                    day.isHoliday
                      ? 'bg-amber-50/40 dark:bg-amber-950/20'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? 'flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white shadow-sm'
                          : 'text-ink'
                      }`}
                    >
                      {day.dayOfMonth}
                    </span>
                    {day.isHoliday && (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        Holiday
                      </span>
                    )}
                  </div>

                  {/* Event Badges */}
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev._id}
                        className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          ev.eventType === 'holiday'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : ev.eventType === 'exam'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : ev.eventType === 'fest'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-ink/50 font-bold">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>

                  <div className="text-[9px] text-ink/40 font-mono mt-1 text-right">
                    {day.menuAvailable ? 'Menu ✓' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day Details Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-line bg-paper p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">Schedule for {selectedDay.date}</h3>
                <p className="text-xs text-ink/60">Day of month: {selectedDay.dayOfMonth}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-sm text-ink/60 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {getEventsForDay(selectedDay.date).length === 0 ? (
                <p className="text-xs text-ink/60 py-4 text-center">
                  No special calendar events recorded for this date. Regular meal schedule applies.
                </p>
              ) : (
                getEventsForDay(selectedDay.date).map((e) => (
                  <div key={e._id} className="rounded-lg border border-line p-3 bg-stone-50 dark:bg-stone-900/30">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-ink">{e.title}</span>
                      <span className="rounded bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand uppercase">
                        {e.eventType}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-ink/70">
                      Attendance Impact Multiplier: <span className="font-bold text-ink">{e.impactMultiplier}x</span>
                    </div>
                    {e.description && (
                      <p className="mt-1 text-xs text-ink/80">{e.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="rounded-lg border border-line px-4 py-1.5 text-xs font-semibold text-ink hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {isAddEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-base font-bold text-ink">Register Calendar Event</h2>
              <button
                type="button"
                onClick={() => setIsAddEventOpen(false)}
                className="text-sm text-ink/60 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-ink/80">Event Date</label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink/80">Event Title</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-xs"
                  placeholder="e.g. Diwali Recess / Midterm Exam"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink/80">Category</label>
                <select
                  value={eventType}
                  onChange={(e) => {
                    const val = e.target.value as 'holiday' | 'exam' | 'fest' | 'vacation' | 'sports' | 'regular' | 'special_meal';
                    setEventType(val);
                    if (val === 'holiday' || val === 'vacation') setEventMultiplier(0.25);
                    else if (val === 'fest') setEventMultiplier(1.25);
                    else if (val === 'exam') setEventMultiplier(0.85);
                    else setEventMultiplier(1.0);
                  }}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-xs"
                >
                  <option value="holiday">University Holiday (Low Attendance)</option>
                  <option value="vacation">Semester Break / Vacation</option>
                  <option value="exam">Examination Week</option>
                  <option value="fest">Cultural / Tech Fest (High Attendance)</option>
                  <option value="sports">Inter-University Sports</option>
                  <option value="special_meal">Special Festive Feast</option>
                  <option value="regular">Regular Schedule</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink/80">
                  Attendance Demand Multiplier: {eventMultiplier}x
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.05"
                  value={eventMultiplier}
                  onChange={(e) => setEventMultiplier(Number(e.target.value))}
                  className="mt-1 block w-full accent-brand"
                />
                <span className="text-[10px] text-ink/50 block">
                  0.25x = ~75% students away from hostel, 1.25x = +25% guest load
                </span>
              </div>

              <div>
                <label className="block font-semibold text-ink/80">Notes / Circular Reference</label>
                <textarea
                  rows={2}
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-xs"
                  placeholder="Dean of Student Affairs notification ref..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsAddEventOpen(false)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
                >
                  {savingEvent ? 'Saving...' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
