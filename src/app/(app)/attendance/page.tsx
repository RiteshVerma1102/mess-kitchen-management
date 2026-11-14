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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

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
        // SW registration in dev
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
      warning('Offline Mode', 'Network disconnected. Attendance will queue locally in IndexedDB.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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
      // Offline fallback
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
      const remaining = await getPendingAttendanceQueue();
      setPendingScans(remaining);

      if (report.syncedCount > 0) {
        success('Synced', `Successfully uploaded ${report.syncedCount} offline scans.`);
        loadAttendanceData();
      }
      if (report.failedCount > 0) {
        error('Sync Warnings', `${report.failedCount} records could not be synced.`);
      }
    } catch {
      error('Sync Error', 'Failed to synchronize with central server');
    } finally {
      setIsSyncing(false);
    }
  };

  // Mark single attendance (Online or Offline queue)
  const handleMarkPresent = async (
    studentRef: string,
    studentName?: string,
    method: 'manual' | 'qr' | 'rfid' = 'manual',
  ) => {
    const payload = {
      studentRef,
      mealType,
      serviceDate,
      messHallId,
      method,
      studentName,
    };

    if (navigator.onLine) {
      try {
        const res = await fetch('/api/v1/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.status === 409) {
          warning('Already Marked', `${studentName || studentRef} already checked in for ${mealType}`);
          return;
        }

        if (res.ok) {
          success('Marked Present', `${studentName || studentRef} verified for ${mealType}`);
          loadAttendanceData();
          return;
        }
      } catch {
        // Fall through to offline queue
      }
    }

    // Queue in IndexedDB
    try {
      const queued: QueuedAttendance = {
        clientUuid: `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        studentRef,
        studentName,
        messHallId,
        serviceDate,
        mealType,
        method,
        deviceId: 'terminal_web_1',
        clientTimestamp: new Date().toISOString(),
        status: 'pending',
        queuedAt: new Date().toISOString(),
      };
      await queueAttendanceRecord(queued);
      setPendingScans((prev) => [queued, ...prev]);
      info('Queued Offline', `${studentName || studentRef} stored in local terminal queue`);
    } catch {
      error('Storage Error', 'Cannot write to offline IndexedDB storage');
    }
  };

  // Fast Barcode / RFID submit
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    const term = quickInput.trim();
    setQuickInput('');

    const matched = students.find(
      (s) =>
        s.enrollmentNumber.toLowerCase() === term.toLowerCase() ||
        (s as unknown as { rfidCardId?: string }).rfidCardId?.toLowerCase() === term.toLowerCase(),
    );

    handleMarkPresent(
      matched ? matched.enrollmentNumber : term,
      matched ? matched.fullName : undefined,
      term.startsWith('RFID') ? 'rfid' : 'qr',
    );

    quickInputRef.current?.focus();
  };

  // Bulk mark present
  const handleBulkMark = async () => {
    if (selectedStudentIds.length === 0) return;
    setBulkMarking(true);

    const selectedStudents = students.filter((s) => selectedStudentIds.includes(s._id));
    for (const s of selectedStudents) {
      await handleMarkPresent(s.enrollmentNumber, s.fullName, 'manual');
    }

    setSelectedStudentIds([]);
    setBulkMarking(false);
    success('Bulk Process Complete', `Marked ${selectedStudents.length} students as present`);
  };

  const isMarked = (rollNo: string) => {
    return recentAttendance.some((r) => r.studentRef === rollNo);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Operations & Sync Bar */}
      <Card>
        <CardHeader>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Meal Attendance Terminal</CardTitle>
              <Badge variant={isOnline ? 'success' : 'warning'} withDot>
                {isOnline ? 'Live Network Connected' : 'Offline Mode (IndexedDB Active)'}
              </Badge>
            </div>
            <CardDescription>
              Kitchen scanner terminal. Supports USB Barcode scanners, RFID taps, and resilient offline synchronization
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsQueueModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <span>📦</span>
              <span>Pending Queue:</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  pendingScans.length > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {pendingScans.length}
              </span>
            </button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleTriggerSync}
              loading={isSyncing}
              disabled={!isOnline || pendingScans.length === 0}
              icon={<span>🔄</span>}
            >
              Sync Pending
            </Button>
          </div>
        </CardHeader>

        {/* Operational Controls: Date, Meal Type, Mess Hall */}
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Service Date</label>
              <Input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Meal Session</label>
              <div className="grid grid-cols-4 gap-1">
                {(['breakfast', 'lunch', 'snacks', 'dinner'] as MealType[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMealType(m)}
                    className={`rounded-xl py-2 text-xs font-bold capitalize transition ${
                      mealType === m
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Dining Hall</label>
              <Select
                value={messHallId}
                onChange={(e) => setMessHallId(e.target.value)}
              >
                <option value="hall_a">Hostel A & B (Boys Mess)</option>
                <option value="hall_b">Hostel C & D (Girls Mess)</option>
                <option value="hall_c">International Hostel Dining</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Turnout Summary Banner */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400">Turnout Rate</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-teal-900">{summary.turnoutPercentage}%</span>
              <span className="text-xs text-slate-400">present</span>
            </div>
          </Card>

          <Card className="p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400">Marked Attendance</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{summary.totalPresent}</span>
              <span className="text-xs text-slate-400">/ {summary.expectedHeadcount} expected</span>
            </div>
          </Card>

          <Card className="p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400">Scanner Methods</span>
            <div className="mt-1 text-xs text-slate-700 font-bold">
              RFID: {summary.methodBreakdown.rfid} | QR: {summary.methodBreakdown.qr} | Manual: {summary.methodBreakdown.manual}
            </div>
          </Card>

          <Card className="p-4">
            <span className="text-[10px] uppercase font-bold text-slate-400">Offline Synced</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600">{summary.offlineSyncedCount}</span>
              <span className="text-xs text-slate-400">from tablets</span>
            </div>
          </Card>
        </div>
      )}

      {/* Fast Hardware Barcode / RFID Tap Input Box */}
      <Card className="border-2 border-teal-800/40 bg-teal-50/30 p-4">
        <form onSubmit={handleQuickSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-800 text-xl text-white shadow-xs">
            ⚡
          </div>
          <div className="flex-1 w-full">
            <label htmlFor="quickInput" className="block text-xs font-bold text-teal-950 uppercase tracking-wider mb-1">
              Rapid Scanner (RFID Tap / Barcode Reader / Keyboard Input)
            </label>
            <input
              id="quickInput"
              ref={quickInputRef}
              type="text"
              autoFocus
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Scan student ID card or type Roll No (e.g. 102203001) and press Enter..."
              className="w-full rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-mono font-bold text-slate-900 shadow-inner focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800"
            />
          </div>
          <Button type="submit" variant="primary" size="md">
            Scan & Mark
          </Button>
        </form>
      </Card>

      {/* Main Grid: Student Roster vs Live Scans History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Roster & Manual Search */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Hostel Residents Roster</CardTitle>
              <CardDescription>Mark present or absent for selected meal session</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Filter by name or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48"
              />

              {selectedStudentIds.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBulkMark}
                  loading={bulkMarking}
                >
                  Mark Present ({selectedStudentIds.length})
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {loadingStudents ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Loading resident roster...
              </div>
            ) : students.length === 0 ? (
              <EmptyState
                icon="👥"
                title="No Residents Found"
                description="No students found for this dining hall selection."
              />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell className="w-8">
                      <input
                        type="checkbox"
                        aria-label="Select all students in this hall"
                        onChange={(e) => {
                          if (e.target.checked) setSelectedStudentIds(students.map((s) => s._id));
                          else setSelectedStudentIds([]);
                        }}
                        checked={selectedStudentIds.length === students.length && students.length > 0}
                      />
                    </TableHeaderCell>
                    <TableHeaderCell>Roll No</TableHeaderCell>
                    <TableHeaderCell>Student Name</TableHeaderCell>
                    <TableHeaderCell>Hostel & Room</TableHeaderCell>
                    <TableHeaderCell>Diet</TableHeaderCell>
                    <TableHeaderCell className="text-right">Action</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student) => {
                    const marked = isMarked(student.enrollmentNumber);
                    const isSelected = selectedStudentIds.includes(student._id);

                    return (
                      <TableRow
                        key={student._id}
                        className={marked ? 'bg-emerald-50/40' : ''}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Select ${student.fullName}`}
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
                        </TableCell>
                        <TableCell className="font-mono font-bold text-teal-900">
                          {student.enrollmentNumber}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {student.fullName}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {student.hostelName}, Rm {student.roomNumber}
                        </TableCell>
                        <TableCell className="capitalize text-[11px] text-slate-600">
                          {student.dietaryPreference}
                        </TableCell>
                        <TableCell className="text-right">
                          {marked ? (
                            <Badge variant="success">✓ Present</Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkPresent(student.enrollmentNumber, student.fullName, 'manual')}
                            >
                              + Mark Present
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Live Attendance History Feed */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader>
              <div>
                <CardTitle>Recent Verified Scans</CardTitle>
                <CardDescription>Live entries recorded for {mealType}</CardDescription>
              </div>
              <Badge variant="primary">{recentAttendance.length} records</Badge>
            </CardHeader>

            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {recentAttendance.length === 0 ? (
                <EmptyState
                  icon="📋"
                  title="No Scans Yet"
                  description={`No verified checks recorded yet for ${mealType}.`}
                />
              ) : (
                recentAttendance.map((rec) => (
                  <div
                    key={rec._id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5 bg-slate-50 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{rec.studentId?.fullName ?? rec.studentRef}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {rec.studentRef} • {new Date(rec.scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="neutral">{rec.method}</Badge>
                      {rec.offlineSynced && (
                        <span className="block text-[9px] text-amber-600 font-bold mt-0.5">
                          Synced
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </div>

          <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            Idempotent UUID guaranteed. Duplicates automatically deduplicated.
          </div>
        </Card>
      </div>

      {/* Offline Queue Modal */}
      <Modal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        title="Pending Offline Attendance Queue"
        description={`${pendingScans.length} records waiting to synchronize`}
      >
        <div className="max-h-[350px] overflow-y-auto space-y-2">
          {pendingScans.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">
              Local terminal queue is clean. All scans are synchronized.
            </p>
          ) : (
            pendingScans.map((item) => (
              <div
                key={item.clientUuid}
                className="flex items-center justify-between rounded-xl border border-slate-100 p-3 bg-slate-50 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">{item.studentName || item.studentRef}</span>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {item.studentRef} • {item.mealType} • {item.serviceDate}
                  </div>
                </div>
                <Badge variant={item.status === 'failed' ? 'danger' : 'warning'}>
                  {item.status}
                </Badge>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-between items-center pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            Network: {isOnline ? 'Online' : 'Offline'}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQueueModalOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSyncing}
              disabled={!isOnline || pendingScans.length === 0}
              onClick={handleTriggerSync}
            >
              Sync Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
