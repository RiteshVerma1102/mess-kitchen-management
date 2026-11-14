'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

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
      {/* Top Header */}
      <PageHeader
        icon="🎓"
        title="Hostel Students Directory"
        description="Enrolled hostel residents, dining hall subscriptions, RFID card associations & dietary preferences"
        badge={
          <Badge variant="primary" withDot>
            {total} Enrolled Students
          </Badge>
        }
      />

      {/* Filter Controls Bar */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[260px]">
              <Input
                type="text"
                placeholder="Search by student name, roll number, hostel, or RFID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>

            <div className="w-48">
              <Select
                value={messHallFilter}
                onChange={(e) => setMessHallFilter(e.target.value)}
              >
                <option value="">All Dining Halls</option>
                <option value="hall_a">Hostel A & B (Boys Mess)</option>
                <option value="hall_b">Hostel C & D (Girls Mess)</option>
                <option value="hall_c">International Hostel Dining</option>
              </Select>
            </div>

            <div className="w-44">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Subscription Statuses</option>
                <option value="active">Active Plan</option>
                <option value="paused">Temporarily Paused</option>
                <option value="defaulter">Dues Defaulter</option>
                <option value="graduated">Graduated / Alum</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Data Table */}
      {loading ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : students.length === 0 ? (
        <EmptyState
          icon="🎓"
          title="No Students Found"
          description="Try adjusting your search criteria or filter options."
          actionText="Clear Filters"
          onAction={() => {
            setSearch('');
            setMessHallFilter('');
            setStatusFilter('');
          }}
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Roll No</TableHeaderCell>
              <TableHeaderCell>Student Name</TableHeaderCell>
              <TableHeaderCell>Hostel & Room</TableHeaderCell>
              <TableHeaderCell>Mess Hall</TableHeaderCell>
              <TableHeaderCell>Diet Preference</TableHeaderCell>
              <TableHeaderCell>RFID Token</TableHeaderCell>
              <TableHeaderCell>Plan Status</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student._id}>
                <TableCell className="font-mono font-bold text-slate-800">
                  {student.enrollmentNumber}
                </TableCell>
                <TableCell>
                  <p className="font-bold text-slate-900">{student.fullName}</p>
                  <p className="text-[11px] text-slate-400">{student.email}</p>
                </TableCell>
                <TableCell>
                  <p className="font-semibold text-slate-800">{student.hostelName}</p>
                  <p className="text-[11px] text-slate-400">Room {student.roomNumber}</p>
                </TableCell>
                <TableCell>
                  <span className="capitalize text-slate-700">
                    {student.messHallId.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="capitalize text-slate-700">
                    {student.dietaryPreference.replace('_', ' ')}
                  </span>
                </TableCell>
                <TableCell>
                  {student.rfidCardId ? (
                    <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                      {student.rfidCardId}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      student.mealPlanStatus === 'active'
                        ? 'success'
                        : student.mealPlanStatus === 'paused'
                        ? 'warning'
                        : 'danger'
                    }
                    withDot
                  >
                    {student.mealPlanStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(student)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    View Card
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Student Profile Card Modal */}
      <Modal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title={selectedStudent?.fullName || 'Resident Profile'}
        description={`Roll Number: ${selectedStudent?.enrollmentNumber}`}
      >
        {selectedStudent && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-slate-400">Email Address</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedStudent.email}</p>
              </div>
              <div>
                <p className="text-slate-400">Contact Phone</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedStudent.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-400">Hostel & Room</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {selectedStudent.hostelName} - Rm {selectedStudent.roomNumber}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Dining Hall</p>
                <p className="font-bold text-slate-800 mt-0.5 capitalize">
                  {selectedStudent.messHallId.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Dietary Class</p>
                <p className="font-bold text-slate-800 mt-0.5 capitalize">
                  {selectedStudent.dietaryPreference.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-slate-400">RFID Tag ID</p>
                <p className="font-bold text-slate-800 mt-0.5 font-mono">
                  {selectedStudent.rfidCardId || 'Not linked'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
