'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/Toast';
import {
  queueAttendanceRecord,
  getPendingAttendanceQueue,
  syncPendingAttendance,
  type QueuedAttendance,
  type SyncReport,
} from '@/lib/offline-attendance';

interface Student {
  _id: string;
  enrollmentNumber: string;
  fullName: string;
  hostelName: string;
  roomNumber: string;
  dietaryPreference: string;
  messHallId: string;
  mealPlanStatus: string;
}

interface AttendanceRecord {
  _id: string;
  studentRef: string;
  mealType: string;
  serviceDate: string;
  method: string;
  scannedAt: string;
  offlineSynced: boolean;
  studentId?: {
    fullName?: string;
    dietaryPreference?: string;
  };
}

interface AttendanceSummary {
  totalPresent: number;
  expectedHeadcount: number;
  turnoutPercentage: number;
  methodBreakdown: { qr: number; rfid: number; manual: number };
  offlineSyncedCount: number;
}

type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

export default function AttendancePage() {
  const { success, error, warning, info } = useToast();

  // Active filters & operational context
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [messHallId, setMessHallId] = useState('hall_a');

  // Network and Sync States
  const [isOnline, setIsOnline] = useState(true);
  const [pendingScans, setPendingScans] = useState<QueuedAttendance[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  // Student Search & Roster
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Quick Barcode / RFID input
  const [quickInput, setQuickInput] = useState('');
  const quickInputRef = useRef<HTMLInputElement>(null);

  // History & Summary
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  // Bulk selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkMarking, setBulkMarking] = useState(false);

  // Check connectivity & register Service Worker
  useEffect(() => {
    setIsOnline(navigator.onLine);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed in dev/unsupported
      });
    }

    const refreshQueue = async () => {
      const q = await getPendingAttendanceQueue();
      setPendingScans(q);
    };

    refreshQueue();

    const handleOnline = async () => {
      setIsOnline(true);
      info('Reconnected', 'Internet connectivity restored. Triggering sync...');
      handleTriggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      warning('Offline Mode', 'Internet disconnected. Attendance will queue locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshPendingCount = useCallback(async () => {
    const q = await getPendingAttendanceQueue();
    setPendingScans(q);
  }, []);

  // Fetch Attendance Records & Summary
  const loadAttendanceData = useCallback(async () => {
    try {
      const [histRes, sumRes] = await Promise.all([
        fetch(`/api/v1/attendance?date=${serviceDate}&mealType=${mealType}&messHallId=${messHallId}&limit=50`),
        fetch(`/api/v1/attendance/summary?date=${serviceDate}&mealType=${mealType}&messHallId=${messHallId}`),
      ]);

      if (histRes.ok) {
        const body = await histRes.json();
        setRecentAttendance(body.data?.attendance || []);
      }
      if (sumRes.ok) {
        const body = await sumRes.json();
        setSummary(body.data);
      }
    } catch {
      // Offline fallback
    }
  }, [serviceDate, mealType, messHallId]);

  // Fetch student roster based on search
  const loadStudents = useCallback(async () => {
    try {
      setLoadingStudents(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (messHallId && messHallId !== 'all') params.set('messHallId', messHallId);
      params.set('limit', '40');

      const res = await fetch(`/api/v1/students?${params.toString()}`);
      if (res.ok) {
        const body = await res.json();
        setStudents(body.data?.students || []);
      }
    } catch {
      // Offline or network error
    } finally {
      setLoadingStudents(false);
    }
  }, [searchQuery, messHallId]);

  useEffect(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadStudents();
    }, 200);
    return () => clearTimeout(t);
  }, [loadStudents]);

  // Perform sync
  const handleTriggerSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const report = await syncPendingAttendance();
      setSyncReport(report);
      await refreshPendingCount();

      if (report.success) {
        if (report.syncedCount > 0) {
          success('Sync Completed', `Synced ${report.syncedCount} scans to server.`);
        } else if (report.totalAttempted === 0) {
          info('Sync Checked', 'All attendance records are up-to-date.');
        }
        loadAttendanceData();
      } else {
        error('Sync Error', report.errors[0] || 'Server failed to process sync.');
      }
    } catch {
      error('Sync Failed', 'Could not communicate with sync endpoint.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Mark attendance for a single student (Online with Offline fallback)
  const handleMarkPresent = async (studentRef: string, studentName?: string, method: 'qr' | 'rfid' | 'manual' = 'manual') => {
    const clientUuid = crypto.randomUUID();
    const clientTimestamp = new Date().toISOString();

    const scanRecord: QueuedAttendance = {
      clientUuid,
      studentRef: studentRef.toUpperCase(),
      studentName: studentName || studentRef,
      messHallId,
      serviceDate,
      mealType,
      method,
      deviceId: 'kitchen_tablet_01',
      clientTimestamp,
      status: 'pending',
      queuedAt: clientTimestamp,
    };

    if (!isOnline) {
      // Save directly to local queue
      await queueAttendanceRecord(scanRecord);
      await refreshPendingCount();
      warning(
        'Offline Scan Saved',
        `${studentRef} queued locally. Will synchronize once online.`,
      );
      setQuickInput('');
      quickInputRef.current?.focus();
      return;
    }

    try {
      const res = await fetch('/api/v1/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientUuid,
          studentRef: studentRef.toUpperCase(),
          messHallId,
          serviceDate,
          mealType,
          method,
          deviceId: 'kitchen_tablet_01',
          clientTimestamp,
        }),
      });

      if (res.ok) {
        const body = await res.json();
        success('Attendance Verified', `Marked ${body.data.student.fullName} (${body.data.student.enrollmentNumber})`);
        loadAttendanceData();
      } else if (res.status === 409) {
        warning('Already Marked', `${studentRef} already scanned for this meal session.`);
      } else {
        // If server fails or unavailable, enqueue locally!
        await queueAttendanceRecord(scanRecord);
        await refreshPendingCount();
        warning('Saved to Offline Queue', `Server unavailable. Stored ${studentRef} in local queue.`);
      }
    } catch {
      await queueAttendanceRecord(scanRecord);
      await refreshPendingCount();
      warning('Queued Offline', `Network dropped. Stored ${studentRef} locally.`);
    } finally {
      setQuickInput('');
      quickInputRef.current?.focus();
    }
  };

  // Quick Barcode / RFID submit handler
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    const isRfid = quickInput.length > 7 && !quickInput.includes('/');
    handleMarkPresent(quickInput.trim(), quickInput.trim(), isRfid ? 'rfid' : 'qr');
  };

  // Bulk marking
  const handleBulkMark = async () => {
    if (selectedStudentIds.length === 0) return;
    setBulkMarking(true);

    const selectedStudents = students.filter((s) => selectedStudentIds.includes(s._id));

    for (const st of selectedStudents) {
      await handleMarkPresent(st.enrollmentNumber, st.fullName, 'manual');
    }

    setSelectedStudentIds([]);
    setBulkMarking(false);
  };

  const isMarked = (rollNo: string) => {
    return recentAttendance.some(
      (r) => r.studentRef.toUpperCase() === rollNo.toUpperCase(),
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Operations & Sync Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-line bg-paper p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink">Meal Attendance Scanner</h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                isOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 text-amber-800 dark:text-amber-300 animate-pulse'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {isOnline ? 'Live Network Connected' : 'Offline Mode (IndexedDB Active)'}
            </span>
          </div>
          <p className="text-xs text-ink/70 mt-1">
            Glove-friendly kitchen terminal. Supports USB Barcode scanners, RFID taps, and resilient offline queue.
          </p>
        </div>

        {/* Sync Controls & Pending Counter */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsQueueModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-line bg-stone-50 dark:bg-stone-900 px-3.5 py-2 text-xs font-semibold text-ink hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <span>📦</span>
            <span>Pending Queue:</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                pendingScans.length > 0 ? 'bg-amber-500 text-white' : 'bg-stone-200 dark:bg-stone-700 text-ink/70'
              }`}
            >
              {pendingScans.length}
            </span>
          </button>

          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={isSyncing || !isOnline || pendingScans.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow hover:opacity-90 disabled:opacity-40 transition"
          >
            <span>🔄</span>
            <span>{isSyncing ? 'Syncing...' : 'Sync Pending'}</span>
          </button>
        </div>
      </div>

      {/* Operational Controls: Date, Meal Type, Mess Hall */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-line bg-paper p-4 shadow-sm text-xs">
        <div>
          <label className="block font-semibold text-ink/80">Service Date</label>
          <input
            type="date"
            value={serviceDate}
            onChange={(e) => setServiceDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold"
          />
        </div>

        <div>
          <label className="block font-semibold text-ink/80">Meal Session</label>
          <div className="mt-1 grid grid-cols-4 gap-1">
            {(['breakfast', 'lunch', 'snacks', 'dinner'] as MealType[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMealType(m)}
                className={`rounded-lg py-2 text-xs font-bold capitalize transition ${
                  mealType === m
                    ? 'bg-brand text-white shadow-sm'
                    : 'border border-line bg-stone-50 dark:bg-stone-900 text-ink/70 hover:text-ink'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-semibold text-ink/80">Dining Hall</label>
          <select
            value={messHallId}
            onChange={(e) => setMessHallId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold"
          >
            <option value="hall_a">Hostel A & B (Boys Mess)</option>
            <option value="hall_b">Hostel C & D (Girls Mess)</option>
            <option value="hall_c">Post-Graduate Dining Hall</option>
          </select>
        </div>
      </div>

      {/* Live Turnout Summary Banner */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-line bg-paper p-4">
            <span className="text-[10px] uppercase font-bold text-ink/50">Turnout Rate</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-brand">{summary.turnoutPercentage}%</span>
              <span className="text-xs text-ink/60">present</span>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-paper p-4">
            <span className="text-[10px] uppercase font-bold text-ink/50">Marked Attendance</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-ink">{summary.totalPresent}</span>
              <span className="text-xs text-ink/60">/ {summary.expectedHeadcount} expected</span>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-paper p-4">
            <span className="text-[10px] uppercase font-bold text-ink/50">Hardware Breakdown</span>
            <div className="mt-1 text-xs text-ink font-medium">
              RFID: {summary.methodBreakdown.rfid} | QR: {summary.methodBreakdown.qr} | Manual: {summary.methodBreakdown.manual}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-paper p-4">
            <span className="text-[10px] uppercase font-bold text-ink/50">Offline Synced</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">{summary.offlineSyncedCount}</span>
              <span className="text-xs text-ink/60">from tablets</span>
            </div>
          </div>
        </div>
      )}

      {/* Fast Hardware Barcode / RFID Tap Input Box */}
      <form
        onSubmit={handleQuickSubmit}
        className="rounded-2xl border-2 border-brand/40 bg-brand/5 p-4 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-xl text-white">
            ⚡
          </div>
          <div className="flex-1 w-full">
            <label htmlFor="quickInput" className="block text-xs font-bold text-brand uppercase tracking-wider">
              Quick Scan (RFID Tap / Barcode Reader / Keyboard Input)
            </label>
            <input
              id="quickInput"
              ref={quickInputRef}
              type="text"
              autoFocus
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Scan student ID card or type Roll No (e.g. 102203001) and press Enter..."
              className="mt-1 block w-full rounded-xl border border-brand/30 bg-white dark:bg-stone-900 px-4 py-2.5 text-sm font-mono font-bold text-ink shadow-inner focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto rounded-xl bg-brand px-6 py-3 text-xs font-bold text-white shadow hover:opacity-90 transition"
          >
            Scan & Mark
          </button>
        </div>
      </form>

      {/* Main Grid: Student Roster vs Live Scans History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Roster & Manual Search */}
        <div className="lg:col-span-2 rounded-xl border border-line bg-paper p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="text-base font-bold text-ink">Hostel Residents Roster</h2>
              <p className="text-xs text-ink/60">Mark present or absent for selected meal</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter by name or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs w-48"
              />

              {selectedStudentIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkMark}
                  disabled={bulkMarking}
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white shadow hover:opacity-90 disabled:opacity-50"
                >
                  {bulkMarking ? 'Marking...' : `Mark Present (${selectedStudentIds.length})`}
                </button>
              )}
            </div>
          </div>

          {loadingStudents ? (
            <div className="py-12 text-center text-xs text-ink/60 animate-pulse">
              Loading resident roster...
            </div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-xs text-ink/60">
              No students found for this hall selection.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-stone-50 dark:bg-stone-900/40 text-ink/70 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStudentIds(students.map((s) => s._id));
                          else setSelectedStudentIds([]);
                        }}
                        checked={selectedStudentIds.length === students.length && students.length > 0}
                      />
                    </th>
                    <th className="px-3 py-2">Roll No</th>
                    <th className="px-3 py-2">Student Name</th>
                    <th className="px-3 py-2">Hostel & Room</th>
                    <th className="px-3 py-2">Diet</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {students.map((student) => {
                    const marked = isMarked(student.enrollmentNumber);
                    const isSelected = selectedStudentIds.includes(student._id);

                    return (
                      <tr
                        key={student._id}
                        className={`hover:bg-stone-50/50 dark:hover:bg-stone-900/40 transition ${
                          marked ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={marked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, student._id]);
                              } else {
                                setSelectedStudentIds(selectedStudentIds.filter((id) => id !== student._id));
                              }
                            }}
                          />
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-brand">
                          {student.enrollmentNumber}
                        </td>
                        <td className="px-3 py-2.5 font-semibold">
                          {student.fullName}
                        </td>
                        <td className="px-3 py-2.5 text-ink/70">
                          {student.hostelName}, Rm {student.roomNumber}
                        </td>
                        <td className="px-3 py-2.5 capitalize text-[11px]">
                          {student.dietaryPreference}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {marked ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                              ✓ Present
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleMarkPresent(student.enrollmentNumber, student.fullName, 'manual')}
                              className="rounded-lg bg-brand/10 hover:bg-brand px-3 py-1 text-[11px] font-bold text-brand hover:text-white transition"
                            >
                              + Mark Present
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Attendance History Feed */}
        <div className="rounded-xl border border-line bg-paper p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h2 className="text-base font-bold text-ink">Recent Scans</h2>
                <p className="text-xs text-ink/60">Live verified entries for this meal</p>
              </div>
              <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                {recentAttendance.length} records
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-[500px] overflow-y-auto">
              {recentAttendance.length === 0 ? (
                <div className="text-center py-10 text-xs text-ink/50">
                  <span className="text-2xl block mb-1">📋</span>
                  No scans recorded yet for {mealType}
                </div>
              ) : (
                recentAttendance.map((rec) => (
                  <div
                    key={rec._id}
                    className="flex items-center justify-between rounded-lg border border-line p-2.5 bg-stone-50/50 dark:bg-stone-900/40 text-xs"
                  >
                    <div>
                      <div className="font-bold text-ink">{rec.studentId?.fullName ?? rec.studentRef}</div>
                      <div className="text-[10px] text-ink/50 font-mono">
                        {rec.studentRef} • {new Date(rec.scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="rounded bg-stone-200 dark:bg-stone-800 px-1.5 py-0.5 text-[10px] font-mono uppercase text-ink/70">
                        {rec.method}
                      </span>
                      {rec.offlineSynced && (
                        <span className="block text-[9px] text-amber-600 font-bold mt-0.5">
                          Synced
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-line text-[11px] text-ink/60 text-center">
            Idempotent UUID guaranteed. Duplicates automatically deduplicated.
          </div>
        </div>
      </div>

      {/* Offline Queue Modal */}
      {isQueueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-line bg-paper p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">Pending Offline Attendance Queue</h3>
                <p className="text-xs text-ink/60">{pendingScans.length} records waiting to synchronize</p>
              </div>
              <button
                type="button"
                onClick={() => setIsQueueModalOpen(false)}
                className="text-sm text-ink/60 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-[350px] overflow-y-auto space-y-2">
              {pendingScans.length === 0 ? (
                <div className="text-center py-8 text-xs text-ink/60">
                  Local queue is empty. All scans are synchronized with server.
                </div>
              ) : (
                pendingScans.map((item) => (
                  <div
                    key={item.clientUuid}
                    className="flex items-center justify-between rounded-lg border border-line p-2.5 bg-stone-50 dark:bg-stone-900/40 text-xs"
                  >
                    <div>
                      <span className="font-bold text-ink">{item.studentName || item.studentRef}</span>
                      <div className="text-[10px] text-ink/50 font-mono">
                        {item.studentRef} • {item.mealType} • {item.serviceDate}
                      </div>
                      {item.error && (
                        <div className="text-[10px] text-red-600 font-semibold mt-0.5">
                          Failed: {item.error}
                        </div>
                      )}
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        item.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-between items-center pt-3 border-t border-line">
              <span className="text-[11px] text-ink/60">
                Network: {isOnline ? 'Available' : 'Unavailable'}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsQueueModalOpen(false)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleTriggerSync();
                  }}
                  disabled={isSyncing || !isOnline || pendingScans.length === 0}
                  className="rounded-lg bg-brand px-4 py-1.5 text-xs font-bold text-white shadow hover:opacity-90 disabled:opacity-40"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
