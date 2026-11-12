import { AuditLogModel } from './audit.model';
import type { Session } from '@/core/auth/session';
import { connectDb } from '@/lib/db';

export interface AuditInput {
  session: Session;
  action: string; // e.g. 'dish.create'
  target: { type: string; id: string };
  before?: unknown;
  after?: unknown;
  ip?: string;
}

// Never put personal data in before/after. Pass only the fields that changed.
export async function writeAudit(input: AuditInput): Promise<void> {
  await connectDb();
  await AuditLogModel.create({
    institutionId: input.session.institutionId,
    actorId: input.session.userId,
    actorRole: input.session.role,
    action: input.action,
    targetType: input.target.type,
    targetId: input.target.id,
    before: input.before ?? null,
    after: input.after ?? null,
    ip: input.ip,
  });
}
