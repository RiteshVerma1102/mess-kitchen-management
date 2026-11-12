import type { Role } from '@/core/rbac/policy';

export interface Session {
  userId: string;
  institutionId: string; // tenant
  role: Role;
  hallIds: string[]; // halls a kitchen-staff user is assigned to
}
