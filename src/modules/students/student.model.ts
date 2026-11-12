import { Schema, model, models, type Model, type Types } from 'mongoose';

export interface IStudent {
  institutionId: string;
  enrollmentNumber: string; // University Roll Number
  fullName: string;
  email: string;
  phone?: string;
  hostelName: string;
  roomNumber: string;
  messHallId: string;
  dietaryPreference: 'vegetarian' | 'non_vegetarian' | 'jain' | 'vegan';
  mealPlanStatus: 'active' | 'paused' | 'graduated' | 'defaulter';
  rfidCardId?: string;
  qrSecret?: string;
  isSynthetic?: boolean;
}

export type StudentDoc = IStudent & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const studentSchema = new Schema<IStudent>(
  {
    institutionId: { type: String, required: true, index: true },
    enrollmentNumber: { type: String, required: true, trim: true, uppercase: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    hostelName: { type: String, required: true, trim: true },
    roomNumber: { type: String, required: true, trim: true },
    messHallId: { type: String, required: true, index: true },
    dietaryPreference: {
      type: String,
      required: true,
      enum: ['vegetarian', 'non_vegetarian', 'jain', 'vegan'],
      default: 'vegetarian',
    },
    mealPlanStatus: {
      type: String,
      required: true,
      enum: ['active', 'paused', 'graduated', 'defaulter'],
      default: 'active',
      index: true,
    },
    rfidCardId: { type: String, trim: true },
    qrSecret: { type: String, trim: true },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

studentSchema.index({ institutionId: 1, enrollmentNumber: 1 }, { unique: true });
studentSchema.index({ institutionId: 1, messHallId: 1 });
studentSchema.index({ institutionId: 1, rfidCardId: 1 }, { sparse: true });

export const StudentModel: Model<IStudent> =
  (models.Student as Model<IStudent>) || model<IStudent>('Student', studentSchema);
