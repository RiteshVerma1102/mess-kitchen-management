'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

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
      error('Network Error', 'Failed to communicate with auth services');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (res.ok) {
        success('Status Updated', currentActive ? 'User account deactivated' : 'User account reactivated');
        setDeactivatingUserId(null);
        fetchUsers();
      } else {
        error('Error', 'Cannot change user status');
      }
    } catch {
      error('Network Error', 'Failed to reach user management server');
    }
  };

  const roleBadgeMap: Record<User['role'], { variant: 'primary' | 'success' | 'warning' | 'info' | 'neutral' | 'danger'; label: string }> = {
    admin: { variant: 'danger', label: 'Super Admin' },
    mess_admin: { variant: 'primary', label: 'Mess Admin' },
    mess_manager: { variant: 'warning', label: 'Mess Manager' },
    kitchen_staff: { variant: 'info', label: 'Kitchen Staff' },
    finance_officer: { variant: 'success', label: 'Finance Officer' },
    student: { variant: 'neutral', label: 'Student Resident' },
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 border border-teal-100 text-teal-800 font-bold text-lg">
              👥
            </div>
            <div>
              <CardTitle>Staff & User Access Management</CardTitle>
              <CardDescription>
                Assign staff roles, mess hall permissions, and institutional security access
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              icon={<span>+</span>}
            >
              Enrol New Staff
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>

            <div className="w-52">
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Security Roles</option>
                <option value="admin">Super Admin</option>
                <option value="mess_admin">Mess Admin</option>
                <option value="mess_manager">Mess Manager</option>
                <option value="kitchen_staff">Kitchen Staff</option>
                <option value="finance_officer">Finance Officer</option>
                <option value="student">Student</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      {loading ? (
        <Card className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : users.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No Users Found"
          description="Try broadening your role filter or search keyword."
          actionText="Enrol First Staff"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Full Name & Email</TableHeaderCell>
              <TableHeaderCell>Role & Permissions</TableHeaderCell>
              <TableHeaderCell>Assigned Mess Halls</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Enrolled Date</TableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => {
              const badgeMeta = roleBadgeMap[u.role] || { variant: 'neutral', label: u.role };
              return (
                <TableRow key={u._id}>
                  <TableCell>
                    <p className="font-bold text-slate-900">{u.fullName}</p>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={badgeMeta.variant} withDot>
                      {badgeMeta.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-600">
                      {u.hallIds && u.hallIds.length > 0
                        ? u.hallIds.map((h) => h.replace('_', ' ').toUpperCase()).join(', ')
                        : 'All Campus Halls'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.active ? 'success' : 'danger'}>
                      {u.active ? 'Active' : 'Suspended'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-[11px]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={u.active ? 'outline' : 'secondary'}
                      size="sm"
                      onClick={() => handleToggleActive(u._id, u.active)}
                    >
                      {u.active ? 'Suspend' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Enrol Staff Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Enrol New Staff Member"
        description="Provide account details and assign RBAC role permissions"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Ramesh Kumar"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. ramesh.chef@thapar.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Select
            label="Staff Role"
            value={role}
            onChange={(e) => setRole(e.target.value as User['role'])}
          >
            <option value="kitchen_staff">Kitchen Staff / Chef</option>
            <option value="mess_manager">Mess Manager</option>
            <option value="mess_admin">Mess Admin</option>
            <option value="finance_officer">Finance Officer</option>
            <option value="admin">Super Admin</option>
          </Select>

          <Select
            label="Assigned Mess Hall"
            value={hallIds[0] || 'hall_a'}
            onChange={(e) => setHallIds([e.target.value])}
          >
            <option value="hall_a">Hostel A & B (Boys Mess)</option>
            <option value="hall_b">Hostel C & D (Girls Mess)</option>
            <option value="hall_c">International Hostel Dining</option>
          </Select>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
            >
              Enrol Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
