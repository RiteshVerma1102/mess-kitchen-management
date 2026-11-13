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
  const [themeMode, setThemeMode] = useState<'logixDark' | 'cleanLight'>('logixDark');
  const [showLogixDishPopup, setShowLogixDishPopup] = useState(false);

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
      error('Required', 'Please enter an event title');
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
          impactMultiplier: Number(eventMultiplier),
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
      {/* Top Controls Bar with Logix Software Dark Mode Toggle */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border transition ${
        themeMode === 'logixDark'
          ? 'bg-[#181F2C] border-slate-800 text-white shadow-xl'
          : 'bg-white border-slate-100 text-slate-900 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-bold text-lg border border-amber-500/30">
            📅
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {themeMode === 'logixDark' ? 'Calendario Mense' : `${monthNames[month - 1]} ${year}`}
            </h1>
            <p className={`text-xs mt-0.5 ${themeMode === 'logixDark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Academic schedule, events registry, and daily dining hall impact
            </p>
          </div>
        </div>

        {/* View Controls & Dark Theme Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Switcher: Logix Software Dark (Image 4) vs Clean Light */}
          <div className={`flex rounded-xl p-1 text-xs font-bold border ${
            themeMode === 'logixDark' ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => setThemeMode('logixDark')}
              className={`rounded-lg px-3 py-1.5 transition ${
                themeMode === 'logixDark' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🌙 Logix Dark (Image 4)
            </button>
            <button
              type="button"
              onClick={() => setThemeMode('cleanLight')}
              className={`rounded-lg px-3 py-1.5 transition ${
                themeMode === 'cleanLight' ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              ☀️ Clean Light
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                themeMode === 'logixDark'
                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleToday}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                themeMode === 'logixDark'
                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                themeMode === 'logixDark'
                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              ›
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddEventOpen(true)}
            className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-3.5 py-2 shadow-sm transition"
          >
            + Aggiungi evento / menu
          </button>
        </div>
      </div>

      {/* Logix Software Interactive Dish Popover Demo Banner */}
      {themeMode === 'logixDark' && (
        <div className="relative rounded-2xl bg-[#1C2536] p-4 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-white">Logix SGM Live Integration:</span>
            <span>Click any day or meal badge to view dish portions, ingredients, and takeaway lunchbox rates.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowLogixDishPopup(!showLogixDishPopup)}
            className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-amber-300 font-bold hover:bg-amber-500/30 transition"
          >
            {showLogixDishPopup ? 'Hide Dish Popover' : 'Preview Dish Popover (Image 4)'}
          </button>
        </div>
      )}

      {/* Popover Card Floating (Logix Image 4 Ditto) */}
      {showLogixDishPopup && (
        <div className="relative z-20 max-w-sm rounded-2xl bg-[#222B3C] p-4 text-white shadow-2xl border border-slate-700 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <div>
              <p className="text-xs font-extrabold text-white">Menu Pesce</p>
              <span className="rounded-sm bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                PRANZO (Take away)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowLogixDishPopup(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Dish 1 */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-900/60 p-2.5 border border-slate-800">
            <div className="h-12 w-12 rounded-lg bg-emerald-600 flex items-center justify-center text-xl shrink-0">
              🥗
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Insalata di salmone</p>
              <p className="text-[10px] text-slate-400 truncate">Salmone, lattuga, carote, zucchine...</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="rounded-xs bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-300">
                  Lunchbox
                </span>
                <span className="text-xs font-extrabold text-amber-400">5,70 €</span>
              </div>
            </div>
          </div>

          {/* Dish 2 */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-900/60 p-2.5 border border-slate-800">
            <div className="h-12 w-12 rounded-lg bg-teal-600 flex items-center justify-center text-xl shrink-0">
              🍲
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Insalata e pesce mix</p>
              <p className="text-[10px] text-slate-400 truncate">Salmone, gamberi, lattuga, mais...</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="rounded-xs bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-300">
                  Lunchbox
                </span>
                <span className="text-xs font-extrabold text-amber-400">5,70 €</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid Container */}
      <div className={`rounded-2xl border overflow-hidden shadow-sm transition ${
        themeMode === 'logixDark'
          ? 'bg-[#181F2C] border-slate-800 text-white'
          : 'bg-white border-slate-100 text-slate-900'
      }`}>
        {/* Day-of-Week Bar */}
        <div className={`grid grid-cols-7 text-center text-[11px] font-extrabold uppercase tracking-wider py-3 border-b ${
          themeMode === 'logixDark'
            ? 'bg-[#141A25] border-slate-800 text-slate-400'
            : 'bg-slate-50 border-slate-100 text-slate-500'
        }`}>
          <div>11 Lun</div>
          <div>12 Mar</div>
          <div>13 Mer</div>
          <div>14 Gio</div>
          <div>15 Ven</div>
          <div>16 Sab</div>
          <div>17 Dom</div>
        </div>

        {/* Days Cells */}
        {loading ? (
          <div className="p-20 text-center text-xs animate-pulse text-slate-400">
            Caricamento calendario in corso...
          </div>
        ) : (
          <div className={`grid grid-cols-7 auto-rows-fr divide-x divide-y ${
            themeMode === 'logixDark' ? 'divide-slate-800/80' : 'divide-slate-100'
          }`}>
            {paddingDays.map((_, i) => (
              <div
                key={`pad-${i}`}
                className={`min-h-[110px] p-2 ${
                  themeMode === 'logixDark' ? 'bg-[#131924]/40' : 'bg-slate-50/50'
                }`}
              />
            ))}

            {data?.days.map((day) => {
              const dayEvents = getEventsForDay(day.date);
              const isToday = new Date().toISOString().slice(0, 10) === day.date;

              return (
                <div
                  key={day.date}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[110px] p-2.5 cursor-pointer transition flex flex-col justify-between ${
                    themeMode === 'logixDark'
                      ? 'hover:bg-slate-800/50 bg-[#181F2C]'
                      : 'hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black ${
                        isToday
                          ? 'flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-sm'
                          : themeMode === 'logixDark' ? 'text-slate-300' : 'text-slate-800'
                      }`}
                    >
                      {day.dayOfMonth}
                    </span>

                    {day.isHoliday && (
                      <span className="rounded-xs bg-rose-500/20 text-rose-300 px-1 py-0.5 text-[9px] font-bold">
                        Festivo
                      </span>
                    )}
                  </div>

                  {/* Logix-style meal badges */}
                  <div className="my-1.5 space-y-1">
                    {/* Meal Pill 1 */}
                    <div className="rounded-sm bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 truncate">
                      Pranzo • Menu Pesce
                    </div>
                    {/* Meal Pill 2 */}
                    <div className="rounded-sm bg-orange-500/20 border border-orange-500/30 px-1.5 py-0.5 text-[10px] font-bold text-orange-300 truncate">
                      Cena • Take Away
                    </div>
                  </div>

                  {/* Events count */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">
                      {dayEvents.length > 0 ? `${dayEvents.length} eventi` : 'Regolare'}
                    </span>
                    <span className="text-emerald-400 font-semibold">● Menu OK</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {isAddEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Academic / Mess Event</h3>
              <button
                type="button"
                onClick={() => setIsAddEventOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Midterm Examinations / Diwali Feast"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                >
                  <option value="holiday">Holiday (Reduced Demand)</option>
                  <option value="exam">Examinations (Morning Surge)</option>
                  <option value="fest">Campus Fest / Special Feast</option>
                  <option value="vacation">Semester Vacation</option>
                  <option value="special_meal">Special Meal Celebration</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Demand Multiplier: {eventMultiplier}x
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={eventMultiplier}
                  onChange={(e) => setEventMultiplier(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEventOpen(false)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="rounded-xl bg-teal-800 px-4 py-2 text-xs font-bold text-white hover:bg-teal-900 transition"
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
