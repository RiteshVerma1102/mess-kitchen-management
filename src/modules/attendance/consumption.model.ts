import { Schema, model, models, type Model, type Types } from 'mongoose';
import type { MealType } from './attendance.model';

export interface IMealConsumption {
  institutionId: string;
  messHallId: string;
  serviceDate: string; // YYYY-MM-DD IST
  mealType: MealType;
  totalSwipes: number;
  headcountEstimate: number;
  guestMeals: number;
  staffMeals: number;
  verifiedBy: string;
  verifiedAt: Date;
  notes?: string;
  isSynthetic?: boolean;
}

export type MealConsumptionDoc = IMealConsumption & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const mealConsumptionSchema = new Schema<IMealConsumption>(
  {
    institutionId: { type: String, required: true, index: true },
    messHallId: { type: String, required: true, index: true },
    serviceDate: { type: String, required: true, index: true },
    mealType: {
      type: String,
      required: true,
      enum: ['breakfast', 'lunch', 'snacks', 'dinner'],
    },
    totalSwipes: { type: Number, required: true, min: 0 },
    headcountEstimate: { type: Number, required: true, min: 0 },
    guestMeals: { type: Number, default: 0, min: 0 },
    staffMeals: { type: Number, default: 0, min: 0 },
    verifiedBy: { type: String, required: true, trim: true },
    verifiedAt: { type: Date, default: () => new Date() },
    notes: { type: String, trim: true },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

mealConsumptionSchema.index(
  { institutionId: 1, messHallId: 1, serviceDate: 1, mealType: 1 },
  { unique: true },
);

export const MealConsumptionModel: Model<IMealConsumption> =
  (models.MealConsumption as Model<IMealConsumption>) ||
  model<IMealConsumption>('MealConsumption', mealConsumptionSchema);
