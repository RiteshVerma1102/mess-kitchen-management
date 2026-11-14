'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

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
    if (!eventTitle.trim()) {
      error('Validation', 'Event title is required');
      return;
    }

    try {
      setSavingEvent(true);
      const res = await fetch('/api/v1/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: eventDate,
          title: eventTitle,
          eventType,
          impactMultiplier: eventMultiplier,
          description: eventDescription,
          affectedMeals: ['breakfast', 'lunch', 'snacks', 'dinner'],
        }),
      });

      if (res.ok) {
        success('Event Added', 'Academic event scheduled successfully');
        setIsAddEventOpen(false);
        setEventTitle('');
        setEventDescription('');
        loadMonth(year, month);
      } else {
        const body = await res.json();
        error('Error', body.error?.message || 'Could not schedule event');
      }
    } catch {
      error('Network Error', 'Failed to reach calendar service');
    } finally {
      setSavingEvent(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const firstDayOfMonth = data?.days[0]?.dayOfWeek ?? 0;
  const paddingDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getEventsForDay = (dateStr: string) => {
    return data?.events.filter((ev) => ev.date === dateStr) || [];
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar (Unified SaaS Light Theme) */}
      <PageHeader
        icon="📅"
        title={`${monthNames[month - 1]} ${year}`}
        description="Academic schedules, holiday impact multipliers, and dining hall headcount forecasts"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#F5F7FA] p-1 rounded-xl border border-[#E5EAF0]">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#253746] hover:bg-[#E5EAF0] shadow-xs transition"
                aria-label="Previous month"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#253746] hover:bg-[#E5EAF0] shadow-xs transition"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#253746] hover:bg-[#E5EAF0] shadow-xs transition"
                aria-label="Next month"
              >
                ›
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddEventOpen(true)}
              icon={<span>➕</span>}
            >
              Add Academic Event
            </Button>
          </div>
        }
      />

      {/* Calendar Grid Container */}
      <div className="rounded-2xl border border-[#E5EAF0] bg-white shadow-xs overflow-hidden">
        {/* Day-of-Week Header Bar */}
        <div className="grid grid-cols-7 text-center text-[11px] font-extrabold uppercase tracking-wider py-3 border-b border-[#E5EAF0] bg-[#F5F7FA] text-[#718096]">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Grid Cells */}
        {loading ? (
          <div className="p-20 text-center text-xs animate-pulse text-[#718096]">
            Loading mess calendar events...
          </div>
        ) : (
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#E5EAF0]">
            {paddingDays.map((_, i) => (
              <div
                key={`pad-${i}`}
                className="min-h-[110px] p-2 bg-[#F5F7FA]/40"
              />
            ))}

            {data?.days.map((day) => {
              const dayEvents = getEventsForDay(day.date);
              const isToday = new Date().toISOString().slice(0, 10) === day.date;

              return (
                <div
                  key={day.date}
                  onClick={() => setSelectedDay(day)}
                  className="min-h-[110px] p-2.5 cursor-pointer transition flex flex-col justify-between hover:bg-[#F5F7FA] bg-white"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black ${
                        isToday
                          ? 'flex h-6 w-6 items-center justify-center rounded-full bg-[#087E8B] text-white shadow-xs'
                          : 'text-[#253746]'
                      }`}
                    >
                      {day.dayOfMonth}
                    </span>

                    {day.isHoliday && (
                      <span className="rounded-md bg-[#FCEEEE] text-[#DC5353] border border-[#DC5353]/20 px-1.5 py-0.5 text-[9px] font-bold">
                        Holiday
                      </span>
                    )}
                  </div>

                  {/* Meal badges */}
                  <div className="my-1.5 space-y-1">
                    <div className="rounded-md bg-[#DDF3F3] border border-[#087E8B]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#087E8B] truncate">
                      Lunch • Standard Thali
                    </div>
                    <div className="rounded-md bg-[#F5F7FA] border border-[#E5EAF0] px-1.5 py-0.5 text-[10px] font-semibold text-[#718096] truncate">
                      Dinner • Rotational Menu
                    </div>
                  </div>

                  {/* Events count */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#718096]">
                      {dayEvents.length > 0 ? `${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}` : 'Regular'}
                    </span>
                    <span className="text-[#16A36A] font-semibold">● Menu OK</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day Details Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#253746]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E5EAF0]">
            <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#253746]">
                  {selectedDay.date}
                </h3>
                <p className="text-xs text-[#718096]">
                  Dining hall operations & calendar details
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="rounded-lg p-1 text-[#718096] hover:bg-[#F5F7FA] hover:text-[#253746]"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-[#F5F7FA] border border-[#E5EAF0] p-3 text-xs">
                <span className="font-bold text-[#718096] block mb-1">Status</span>
                <p className="text-[#253746] font-semibold">
                  {selectedDay.isHoliday ? 'Campus Holiday (Reduced turnout multiplier: 0.35x)' : 'Full Session Academic Day (Standard multiplier: 1.0x)'}
                </p>
              </div>

              <div className="rounded-xl bg-[#DDF3F3] border border-[#087E8B]/20 p-3 text-xs text-[#087E8B]">
                <span className="font-bold block mb-1">Menu Schedule</span>
                <p className="text-[#253746] font-medium">Breakfast, Lunch, Snacks, Dinner published and active.</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedDay(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {isAddEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#253746]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E5EAF0] text-[#253746] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-3">
              <h3 className="text-base font-bold text-[#253746]">Add Academic / Mess Event</h3>
              <button
                type="button"
                onClick={() => setIsAddEventOpen(false)}
                className="text-[#718096] hover:text-[#253746]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#253746] mb-1">Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs text-[#253746] focus:border-[#087E8B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#253746] mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Midterm Examinations / Diwali Feast"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs text-[#253746] focus:border-[#087E8B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#253746] mb-1">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full rounded-xl border border-[#E5EAF0] bg-white px-3 py-2 text-xs text-[#253746] focus:border-[#087E8B] focus:outline-none"
                >
                  <option value="holiday">Holiday (Reduced Demand)</option>
                  <option value="exam">Examinations (Morning Surge)</option>
                  <option value="fest">Campus Fest / Special Feast</option>
                  <option value="vacation">Semester Vacation</option>
                  <option value="special_meal">Special Meal Celebration</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#253746] mb-1">
                  Demand Multiplier: {eventMultiplier}x
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={eventMultiplier}
                  onChange={(e) => setEventMultiplier(parseFloat(e.target.value))}
                  className="w-full accent-[#087E8B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5EAF0]">
                <button
                  type="button"
                  onClick={() => setIsAddEventOpen(false)}
                  className="rounded-xl border border-[#E5EAF0] px-3 py-2 text-xs font-semibold text-[#718096] hover:bg-[#F5F7FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="rounded-xl bg-[#087E8B] px-4 py-2 text-xs font-bold text-white hover:bg-[#066873] transition"
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
