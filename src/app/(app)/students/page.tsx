'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';

interface Student {
  _id: string;
  enrollmentNumber: string;
  fullName: string;
  email: string;
  phone?: string;
  hostelName: string;
  roomNumber: string;
  messHallId: string;
  dietaryPreference: 'vegetarian' | 'non_vegetarian' | 'jain' | 'vegan';
  mealPlanStatus: 'active' | 'paused' | 'graduated' | 'defaulter';
  rfidCardId?: string;
}

export default function StudentsDirectoryPage() {
  const { error } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [messHallFilter, setMessHallFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected student for detail view
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (messHallFilter) params.set('messHallId', messHallFilter);
      if (statusFilter) params.set('mealPlanStatus', statusFilter);
      params.set('limit', '100');

      const res = await fetch(`/api/v1/students?${params.toString()}`);
      if (res.ok) {
        const body = await res.json();
        setStudents(body.data.students || []);
        setTotal(body.data.total || 0);
      } else {
        error('Error', 'Failed to load students directory');
      }
    } catch {
      error('Network Error', 'Could not reach students service');
    } finally {
      setLoading(false);
    }
  }, [search, messHallFilter, statusFilter, error]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [fetchStudents]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Hostel Students Directory</h1>
          <p className="text-xs text-ink/70 mt-1">
            Enrolled hostel residents, dining hall subscriptions, RFID card associations & dietary preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink">
            {total} Enrolled Students
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search by student name, roll number, hostel, or RFID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[240px] rounded-lg border border-line bg-paper px-3 py-1.5 text-xs focus:border-brand focus:outline-none"
        />

        <select
          value={messHallFilter}
          onChange={(e) => setMessHallFilter(e.target.value)}
          className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs text-ink"
        >
          <option value="">All Dining Halls</option>
          <option value="hall_a">Hostel A & B (Boys Mess)</option>
          <option value="hall_b">Hostel C & D (Girls Mess)</option>
          <option value="hall_c">Post-Graduate Dining Hall</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs text-ink"
        >
          <option value="">All Meal Plan Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused / Leave</option>
          <option value="graduated">Graduated</option>
          <option value="defaulter">Defaulter</option>
        </select>
      </div>

      {/* Students Table */}
      {loading ? (
        <div className="rounded-xl border border-line bg-paper p-12 text-center text-xs text-ink/60 animate-pulse">
          Loading student roster...
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-paper p-12 text-center">
          <span className="text-3xl">🎓</span>
          <p className="mt-2 text-sm font-semibold text-ink">No students match filter criteria</p>
          <p className="text-xs text-ink/60 mt-1">Try clearing your search query or dining hall selection</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-paper shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-stone-50 dark:bg-stone-900/60 text-ink/70 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Roll Number</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Hostel & Room</th>
                <th className="px-4 py-3">Dining Hall</th>
                <th className="px-4 py-3">Dietary</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">RFID Card</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {students.map((student) => (
                <tr
                  key={student._id}
                  className="hover:bg-stone-50/50 dark:hover:bg-stone-900/40 transition"
                >
                  <td className="px-4 py-3.5 font-mono font-bold text-brand">
                    {student.enrollmentNumber}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    <div>{student.fullName}</div>
                    <div className="text-[11px] font-normal text-ink/50">{student.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {student.hostelName}, Rm {student.roomNumber}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] uppercase">
                    {student.messHallId}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold ${
                        student.dietaryPreference === 'vegetarian'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : student.dietaryPreference === 'jain'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {student.dietaryPreference}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        student.mealPlanStatus === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : student.mealPlanStatus === 'paused'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}
                    >
                      {student.mealPlanStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-ink/70">
                    {student.rfidCardId || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(student)}
                      className="rounded bg-brand/10 hover:bg-brand/20 px-2.5 py-1 text-[11px] font-semibold text-brand transition"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Student Details Dialog */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">{selectedStudent.fullName}</h3>
                <p className="text-xs text-brand font-mono">{selectedStudent.enrollmentNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="text-sm text-ink/60 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs text-ink/80">
              <div className="flex justify-between border-b border-line/50 py-1.5">
                <span className="font-semibold text-ink/60">Email:</span>
                <span>{selectedStudent.email}</span>
              </div>
              <div className="flex justify-between border-b border-line/50 py-1.5">
                <span className="font-semibold text-ink/60">Phone:</span>
                <span>{selectedStudent.phone || 'Not recorded'}</span>
              </div>
              <div className="flex justify-between border-b border-line/50 py-1.5">
                <span className="font-semibold text-ink/60">Hostel & Room:</span>
                <span>{selectedStudent.hostelName}, Room {selectedStudent.roomNumber}</span>
              </div>
              <div className="flex justify-between border-b border-line/50 py-1.5">
                <span className="font-semibold text-ink/60">Assigned Mess Hall:</span>
                <span className="uppercase font-mono">{selectedStudent.messHallId}</span>
              </div>
              <div className="flex justify-between border-b border-line/50 py-1.5">
                <span className="font-semibold text-ink/60">Dietary Preference:</span>
                <span className="capitalize font-semibold">{selectedStudent.dietaryPreference}</span>
              </div>
              <div className="flex justify-between border-b border-line/50 py-1.5">
                <span className="font-semibold text-ink/60">Meal Plan Status:</span>
                <span className="uppercase font-bold text-brand">{selectedStudent.mealPlanStatus}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="font-semibold text-ink/60">RFID Card Identifier:</span>
                <span className="font-mono">{selectedStudent.rfidCardId || 'None registered'}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="rounded-lg border border-line px-4 py-1.5 text-xs font-semibold text-ink hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
