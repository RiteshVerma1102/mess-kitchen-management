import { Schema, model, models, type Model, type Types } from 'mongoose';
import type { MealType } from '@/modules/attendance/attendance.model';

export interface IPlanItem {
  dishId: Types.ObjectId;
  dishName: string;
  plannedPortions: number;
  estimatedCostPaise: number; // integer paise
  prepNotes?: string;
}

export interface IPreparationPlan {
  institutionId: string;
  messHallId: string;
  serviceDate: string; // YYYY-MM-DD IST
  mealType: MealType;
  forecastedHeadcount: number;
  bufferPercentage: number;
  plannedPortions: number;
  items: IPlanItem[];
  totalEstimatedCostPaise: number; // integer paise
  status: 'draft' | 'approved' | 'in_kitchen' | 'completed';
  approvedBy?: string;
  isSynthetic?: boolean;
}

export type PreparationPlanDoc = IPreparationPlan & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const planItemSchema = new Schema<IPlanItem>(
  {
    dishId: { type: Schema.Types.ObjectId, ref: 'Dish', required: true },
    dishName: { type: String, required: true, trim: true },
    plannedPortions: { type: Number, required: true, min: 0 },
    estimatedCostPaise: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    prepNotes: { type: String, trim: true },
  },
  { _id: false },
);

const preparationPlanSchema = new Schema<IPreparationPlan>(
  {
    institutionId: { type: String, required: true, index: true },
    messHallId: { type: String, required: true, index: true },
    serviceDate: { type: String, required: true, index: true },
    mealType: {
      type: String,
      required: true,
      enum: ['breakfast', 'lunch', 'snacks', 'dinner'],
    },
    forecastedHeadcount: { type: Number, required: true, min: 0 },
    bufferPercentage: { type: Number, default: 5, min: 0, max: 25 },
    plannedPortions: { type: Number, required: true, min: 0 },
    items: { type: [planItemSchema], default: [] },
    totalEstimatedCostPaise: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'approved', 'in_kitchen', 'completed'],
      default: 'draft',
      index: true,
    },
    approvedBy: { type: String, trim: true },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

preparationPlanSchema.index(
  { institutionId: 1, messHallId: 1, serviceDate: 1, mealType: 1 },
  { unique: true },
);

export const PreparationPlanModel: Model<IPreparationPlan> =
  (models.PreparationPlan as Model<IPreparationPlan>) ||
  model<IPreparationPlan>('PreparationPlan', preparationPlanSchema);
