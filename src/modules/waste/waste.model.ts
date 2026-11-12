import { Schema, model, models, type Model, type Types } from 'mongoose';
import type { MealType } from '@/modules/attendance/attendance.model';

export type WasteType = 'kitchen_prep' | 'unserved_leftover' | 'student_plate_waste' | 'spoilage';

export type WasteReasonCode =
  | 'over_preparation'
  | 'low_attendance_exam'
  | 'low_attendance_holiday'
  | 'rain_disruption'
  | 'burning_cooking_error'
  | 'spoilage_power_cut'
  | 'quality_rejection'
  | 'plate_uneaten';

export interface IFoodWaste {
  institutionId: string;
  messHallId: string;
  serviceDate: string; // YYYY-MM-DD IST
  mealType: MealType;
  dishId?: Types.ObjectId;
  wasteType: WasteType;
  quantityKg: number;
  financialLossPaise: number; // integer paise
  reasonCode: WasteReasonCode;
  recordedBy: string;
  disposalMethod: 'compost' | 'biogas' | 'piggery_feed' | 'municipal_waste';
  notes?: string;
  isSynthetic?: boolean;
}

export type FoodWasteDoc = IFoodWaste & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const foodWasteSchema = new Schema<IFoodWaste>(
  {
    institutionId: { type: String, required: true, index: true },
    messHallId: { type: String, required: true, index: true },
    serviceDate: { type: String, required: true, index: true },
    mealType: {
      type: String,
      required: true,
      enum: ['breakfast', 'lunch', 'snacks', 'dinner'],
    },
    dishId: { type: Schema.Types.ObjectId, ref: 'Dish' },
    wasteType: {
      type: String,
      required: true,
      enum: ['kitchen_prep', 'unserved_leftover', 'student_plate_waste', 'spoilage'],
    },
    quantityKg: { type: Number, required: true, min: 0.01 },
    financialLossPaise: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    reasonCode: {
      type: String,
      required: true,
      enum: [
        'over_preparation',
        'low_attendance_exam',
        'low_attendance_holiday',
        'rain_disruption',
        'burning_cooking_error',
        'spoilage_power_cut',
        'quality_rejection',
        'plate_uneaten',
      ],
      index: true,
    },
    recordedBy: { type: String, required: true, trim: true },
    disposalMethod: {
      type: String,
      required: true,
      enum: ['compost', 'biogas', 'piggery_feed', 'municipal_waste'],
      default: 'compost',
    },
    notes: { type: String, trim: true },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

foodWasteSchema.index({ institutionId: 1, serviceDate: -1 });
foodWasteSchema.index({ institutionId: 1, messHallId: 1, serviceDate: 1, mealType: 1 });
foodWasteSchema.index({ institutionId: 1, wasteType: 1 });

export const FoodWasteModel: Model<IFoodWaste> =
  (models.FoodWaste as Model<IFoodWaste>) || model<IFoodWaste>('FoodWaste', foodWasteSchema);
