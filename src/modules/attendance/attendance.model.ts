import { Schema, model, models, type Model, type Types } from 'mongoose';

export type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner';
export type ScanMethod = 'qr' | 'rfid' | 'manual';

export interface IAttendance {
  institutionId: string;
  clientUuid: string; // client-generated idempotency key (UUID v4)
  studentRef: string; // opaque student hash or roll number
  studentId?: Types.ObjectId;
  messHallId: string;
  serviceDate: string; // YYYY-MM-DD IST
  mealType: MealType;
  method: ScanMethod;
  scannedAt: Date;
  deviceId: string;
  offlineSynced: boolean;
  clockSkewSeconds: number;
  isSynthetic?: boolean;
}

export type AttendanceDoc = IAttendance & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const attendanceSchema = new Schema<IAttendance>(
  {
    institutionId: { type: String, required: true, index: true },
    clientUuid: { type: String, required: true, unique: true, trim: true },
    studentRef: { type: String, required: true, trim: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    messHallId: { type: String, required: true, index: true },
    serviceDate: { type: String, required: true, index: true },
    mealType: {
      type: String,
      required: true,
      enum: ['breakfast', 'lunch', 'snacks', 'dinner'],
      index: true,
    },
    method: {
      type: String,
      required: true,
      enum: ['qr', 'rfid', 'manual'],
      default: 'qr',
    },
    scannedAt: { type: Date, required: true, default: () => new Date() },
    deviceId: { type: String, required: true, trim: true },
    offlineSynced: { type: Boolean, default: false },
    clockSkewSeconds: { type: Number, default: 0 },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

attendanceSchema.index({ institutionId: 1, clientUuid: 1 }, { unique: true });
attendanceSchema.index({ institutionId: 1, messHallId: 1, serviceDate: 1, mealType: 1 });
attendanceSchema.index({ institutionId: 1, studentRef: 1, serviceDate: 1, mealType: 1 });

export const AttendanceModel: Model<IAttendance> =
  (models.Attendance as Model<IAttendance>) || model<IAttendance>('Attendance', attendanceSchema);
