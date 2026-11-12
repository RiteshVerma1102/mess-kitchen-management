import { ForbiddenError } from '@/lib/errors';
import type { Session } from '@/core/auth/session';

export const ROLES = ['student', 'kitchen_staff', 'mess_manager', 'mess_admin', 'finance_officer', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'menu:read', 'menu:write',
  'dish:read', 'dish:write', 'recipe:write', 'ingredient:write', 'hall:write',
  'attendance:create', 'attendance:read',
  'calendar:read', 'calendar:write',
  'forecast:read', 'forecast:override', 'forecast:configure',
  'plan:read', 'plan:write',
  'actual:read', 'actual:write',
  'waste:read', 'cost:read', 'analytics:read',
  'audit:read', 'user:manage', 'settings:write',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

// Role x permission matrix. Source of truth for the role/permission document.
export const MATRIX: Record<Role, readonly Permission[]> = {
  student: ['menu:read', 'dish:read', 'attendance:create', 'calendar:read'],
  kitchen_staff: [
    'menu:read', 'dish:read', 'attendance:create', 'attendance:read', 'calendar:read',
    'forecast:read', 'plan:read', 'actual:read', 'actual:write',
  ],
  mess_manager: [
    'menu:read', 'menu:write', 'dish:read', 'attendance:read', 'calendar:read', 'calendar:write',
    'forecast:read', 'forecast:override', 'plan:read', 'plan:write', 'actual:read',
    'waste:read', 'cost:read', 'analytics:read',
  ],
  mess_admin: [
    'menu:read', 'menu:write', 'dish:read', 'dish:write', 'recipe:write', 'ingredient:write', 'hall:write',
    'calendar:read', 'calendar:write', 'cost:read',
  ],
  finance_officer: ['waste:read', 'cost:read', 'analytics:read', 'plan:read'], // read-only
  admin: [
    'forecast:configure', 'settings:write', 'user:manage', 'audit:read',
    'menu:read', 'dish:read', 'calendar:read', 'forecast:read', 'analytics:read', 'attendance:read',
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export function assertCan(session: Session, permission: Permission): void {
  if (!can(session.role, permission)) throw new ForbiddenError();
}

// Attribute check: kitchen staff only act on the halls they are assigned to.
export function canAccessHall(session: Session, hallId: string): boolean {
  switch (session.role) {
    case 'kitchen_staff':
      return session.hallIds.includes(hallId);
    case 'mess_manager':
    case 'mess_admin':
    case 'admin':
    case 'finance_officer':
      return true;
    default:
      return false;
  }
}

export function assertHall(session: Session, hallId: string): void {
  if (!canAccessHall(session, hallId)) throw new ForbiddenError('You are not assigned to this hall');
}
