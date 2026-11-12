import { Schema, model, models, type Model } from 'mongoose';

export interface IAuditLog {
  institutionId: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  before: unknown;
  after: unknown;
  ip?: string;
  at: Date;
}

const auditSchema = new Schema<IAuditLog>(
  {
    institutionId: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: { type: String },
    at: { type: Date, default: () => new Date(), index: true },
  },
  { versionKey: false },
);

auditSchema.index({ institutionId: 1, at: -1 });
auditSchema.index({ institutionId: 1, targetType: 1, targetId: 1 });

// Append-only: any update or delete path is rejected.
const blocked = [
  'updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne',
  'deleteOne', 'deleteMany', 'findOneAndDelete',
] as const;
for (const op of blocked) {
  auditSchema.pre(op as 'updateOne', function () {
    throw new Error('Audit log is append-only');
  });
}
auditSchema.pre('save', function (next) {
  if (!this.isNew) return next(new Error('Audit log is append-only'));
  next();
});

export const AuditLogModel: Model<IAuditLog> =
  (models.AuditLog as Model<IAuditLog>) || model<IAuditLog>('AuditLog', auditSchema);
