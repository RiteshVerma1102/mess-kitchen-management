import { Schema, model, models, type Model, type Types } from 'mongoose';
import type { MealType } from '@/modules/attendance/attendance.model';

export interface IServiceActual {
  institutionId: string;
  messHallId: string;
  serviceDate: string; // YYYY-MM-DD IST
  mealType: MealType;
  dishId: Types.ObjectId;
  dishName: string;
  quantityPrepared: number;
  quantityServed: number;
  quantityLeftover: number;
  unit: 'portion' | 'kg';
  recordedBy: string;
  recordedAt: Date;
  notes?: string;
  isSynthetic?: boolean;
}

export type ServiceActualDoc = IServiceActual & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const serviceActualSchema = new Schema<IServiceActual>(
  {
    institutionId: { type: String, required: true, index: true },
    messHallId: { type: String, required: true, index: true },
    serviceDate: { type: String, required: true, index: true },
    mealType: {
      type: String,
      required: true,
      enum: ['breakfast', 'lunch', 'snacks', 'dinner'],
    },
    dishId: { type: Schema.Types.ObjectId, ref: 'Dish', required: true },
    dishName: { type: String, required: true, trim: true },
    quantityPrepared: { type: Number, required: true, min: 0 },
    quantityServed: { type: Number, required: true, min: 0 },
    quantityLeftover: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ['portion', 'kg'], default: 'portion' },
    recordedBy: { type: String, required: true, trim: true },
    recordedAt: { type: Date, default: () => new Date() },
    notes: { type: String, trim: true },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

serviceActualSchema.index(
  { institutionId: 1, messHallId: 1, serviceDate: 1, mealType: 1, dishId: 1 },
  { unique: true },
);
serviceActualSchema.index({ institutionId: 1, serviceDate: -1 });

export const ServiceActualModel: Model<IServiceActual> =
  (models.ServiceActual as Model<IServiceActual>) ||
  model<IServiceActual>('ServiceActual', serviceActualSchema);
