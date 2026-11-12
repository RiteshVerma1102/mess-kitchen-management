import { describe, it, expect } from 'vitest';
import { can, assertCan, canAccessHall, assertHall, MATRIX, ROLES } from '@/core/rbac/policy';
import { ForbiddenError } from '@/lib/errors';
import type { Session } from '@/core/auth/session';

const s = (role: Session['role'], hallIds: string[] = []): Session => ({ userId: 'u1', institutionId: 'i1', role, hallIds });

describe('RBAC matrix', () => {
  it('student can view menu but not edit dishes', () => {
    expect(can('student', 'menu:read')).toBe(true);
    expect(can('student', 'dish:write')).toBe(false);
    expect(() => assertCan(s('student'), 'dish:write')).toThrow(ForbiddenError);
  });
  it('finance officer is read-only', () => {
    const writes = MATRIX.finance_officer.filter((p) => p.endsWith(':write') || p.endsWith(':create') || p.endsWith(':override'));
    expect(writes).toEqual([]);
    expect(can('finance_officer', 'cost:read')).toBe(true);
  });
  it('only kitchen staff and above can write actuals', () => {
    expect(can('kitchen_staff', 'actual:write')).toBe(true);
    expect(can('student', 'actual:write')).toBe(false);
    expect(can('finance_officer', 'actual:write')).toBe(false);
  });
  it('only admin configures the forecast', () => {
    for (const r of ROLES) expect(can(r, 'forecast:configure')).toBe(r === 'admin');
  });
  it('students never see cost data', () => {
    expect(can('student', 'cost:read')).toBe(false);
    expect(can('student', 'waste:read')).toBe(false);
  });
});

describe('hall attribute check', () => {
  it('kitchen staff only access assigned halls', () => {
    expect(canAccessHall(s('kitchen_staff', ['h1']), 'h1')).toBe(true);
    expect(canAccessHall(s('kitchen_staff', ['h1']), 'h2')).toBe(false);
    expect(() => assertHall(s('kitchen_staff', ['h1']), 'h2')).toThrow(ForbiddenError);
  });
  it('manager sees all halls, student none', () => {
    expect(canAccessHall(s('mess_manager'), 'h9')).toBe(true);
    expect(canAccessHall(s('student'), 'h1')).toBe(false);
  });
});
