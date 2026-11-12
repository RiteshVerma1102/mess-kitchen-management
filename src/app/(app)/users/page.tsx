'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';

interface User {
  _id: string;
  fullName: string;
  email: string;
  role: 'student' | 'kitchen_staff' | 'mess_manager' | 'mess_admin' | 'finance_officer' | 'admin';
  hallIds: string[];
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export default function UserManagementPage() {
  const { success, error } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>('kitchen_staff');
  const [hallIds, setHallIds] = useState<string[]>(['hall_a']);
  const [saving, setSaving] = useState(false);

  // Deactivate confirm modal
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/v1/users?${params.toString()}`);
      if (res.ok) {
        const body = await res.json();
        setUsers(body.data?.users || []);
        setTotal(body.data?.total || 0);
      } else {
        error('Permission Denied', 'Only institutional administrators can manage users');
      }
    } catch {
      error('Network Error', 'Failed to retrieve user directory');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, error]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        fullName,
        email,
        password,
        role,
        hallIds,
        active: true,
      };

      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        error('Failed to Create User', body?.error?.message ?? 'Validation failed');
        setSaving(false);
        return;
      }

      success('User Enrolled', `Account for ${fullName} created successfully`);
      setIsCreateOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch {
      error('Network Error', 'Could not communicate with user API');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (userId: string) => {
    try {
      const res = await fetch(`/api/v1/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        success('User Deactivated', 'Account has been safely set to inactive');
        setDeactivatingUserId(null);
        fetchUsers();
      } else {
        const body = await res.json();
        error('Action Failed', body?.error?.message ?? 'Could not deactivate user');
      }
    } catch {
      error('Network Error', 'Failed to execute deactivation');
    }
  };

  const roleNameMap: Record<string, string> = {
    admin: 'Super Admin',
    mess_admin: 'Mess Admin',
    mess_manager: 'Mess Manager',
    kitchen_staff: 'Kitchen Staff / Operator',
    finance_officer: 'Finance Officer (Viewer)',
    student: 'Student Resident',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">User & Staff Management</h1>
          <p className="text-xs text-ink/70 mt-1">
            Role-Based Access Control (RBAC), dining hall assignments & institutional credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow hover:opacity-95"
        >
          <span>+</span>
          <span>Add New User</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper p-4 shadow-sm">
        <input
          type="text"
          placeholder="Search by full name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[240px] rounded-lg border border-line bg-paper px-3 py-1.5 text-xs focus:border-brand focus:outline-none"
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs text-ink"
        >
          <option value="">All RBAC Roles</option>
          <option value="admin">Super Admin</option>
          <option value="mess_admin">Mess Admin</option>
          <option value="mess_manager">Mess Manager</option>
          <option value="kitchen_staff">Kitchen Staff</option>
          <option value="finance_officer">Finance Officer</option>
          <option value="student">Student</option>
        </select>

        <span className="text-xs font-semibold text-ink/70">
          {total} Total Users
        </span>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="rounded-xl border border-line bg-paper p-12 text-center text-xs text-ink/60 animate-pulse">
          Loading users directory...
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-paper p-12 text-center">
          <span className="text-3xl">👥</span>
          <p className="mt-2 text-sm font-semibold text-ink">No users found</p>
          <p className="text-xs text-ink/60 mt-1">Create an institutional user account</p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white"
          >
            + Add New User
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-paper shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-stone-50 dark:bg-stone-900/60 text-ink/70 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Hall Scope</th>
                <th className="px-4 py-3">Account Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-stone-50/50 dark:hover:bg-stone-900/40 transition">
                  <td className="px-4 py-3.5 font-semibold">
                    {u.fullName}
                  </td>
                  <td className="px-4 py-3 text-ink/80 font-mono text-[11px]">
                    {u.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-brand/10 dark:bg-brand/20 px-2 py-0.5 text-[11px] font-semibold text-brand">
                      {roleNameMap[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono uppercase text-ink/70">
                    {u.hallIds && u.hallIds.length > 0 ? u.hallIds.join(', ') : 'All Halls'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        u.active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.active && (
                      <button
                        type="button"
                        onClick={() => setDeactivatingUserId(u._id)}
                        className="rounded px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deactivate Confirm Modal */}
      {deactivatingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-line bg-paper p-6 shadow-xl">
            <h3 className="text-base font-bold text-ink">Confirm Deactivation</h3>
            <p className="mt-2 text-xs text-ink/70">
              The user will no longer be permitted to log in or perform kitchen operations. Historical logs and audit records will remain preserved.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeactivatingUserId(null)}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeactivate(deactivatingUserId)}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:opacity-90"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-base font-bold text-ink">Add Institutional User</h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-sm text-ink/60 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-ink/80">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-xs"
                  placeholder="e.g. Gurpreet Singh"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink/80">University Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-xs"
                  placeholder="staff@thapar.edu"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink/80">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as User['role'])}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-xs"
                >
                  <option value="kitchen_staff">Kitchen Staff / Attendance Operator</option>
                  <option value="mess_manager">Mess Manager</option>
                  <option value="mess_admin">Mess Admin</option>
                  <option value="finance_officer">Finance Officer (Read-only)</option>
                  <option value="student">Student</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink/80">Assigned Dining Hall</label>
                <select
                  value={hallIds[0] || 'hall_a'}
                  onChange={(e) => setHallIds([e.target.value])}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-xs"
                >
                  <option value="hall_a">Hostel A & B (Boys Mess)</option>
                  <option value="hall_b">Hostel C & D (Girls Mess)</option>
                  <option value="hall_c">Post-Graduate Dining Hall</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink/80">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-xs"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-brand px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Enroll User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
