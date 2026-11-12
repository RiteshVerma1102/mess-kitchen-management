import { Schema, model, models, type Model, type Types } from 'mongoose';
import type { MealType } from '@/modules/attendance/attendance.model';

export interface IForecast {
  institutionId: string;
  messHallId: string;
  targetDate: string; // YYYY-MM-DD
  mealType: MealType;
  predictedCount: number;
  lowerBound: number;
  upperBound: number;
  confidenceLevel: number; // e.g. 0.90
  recommendedPortions: number;
  bufferPercentage: number;
  modelVersion: string; // e.g. 'baseline_v1_dow'
  dataPointsCount: number;
  historicalMean: number;
  historicalStdDev: number;
  calendarMultiplier: number;
  explanation: string;
  overridden: boolean;
  overrideCount?: number;
  overrideReason?: string;
  overriddenBy?: string;
  isSynthetic?: boolean;
}

export type ForecastDoc = IForecast & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const forecastSchema = new Schema<IForecast>(
  {
    institutionId: { type: String, required: true, index: true },
    messHallId: { type: String, required: true, index: true },
    targetDate: { type: String, required: true, index: true },
    mealType: {
      type: String,
      required: true,
      enum: ['breakfast', 'lunch', 'snacks', 'dinner'],
      index: true,
    },
    predictedCount: { type: Number, required: true, min: 0 },
    lowerBound: { type: Number, required: true, min: 0 },
    upperBound: { type: Number, required: true, min: 0 },
    confidenceLevel: { type: Number, default: 0.90 },
    recommendedPortions: { type: Number, required: true, min: 0 },
    bufferPercentage: { type: Number, default: 8, min: 0, max: 50 },
    modelVersion: { type: String, default: 'baseline_v1_dow' },
    dataPointsCount: { type: Number, default: 0 },
    historicalMean: { type: Number, default: 0 },
    historicalStdDev: { type: Number, default: 0 },
    calendarMultiplier: { type: Number, default: 1.0 },
    explanation: { type: String, required: true },
    overridden: { type: Boolean, default: false },
    overrideCount: { type: Number },
    overrideReason: { type: String, trim: true },
    overriddenBy: { type: String, trim: true },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

forecastSchema.index(
  { institutionId: 1, messHallId: 1, targetDate: 1, mealType: 1 },
  { unique: true },
);
forecastSchema.index({ institutionId: 1, targetDate: 1 });

export const ForecastModel: Model<IForecast> =
  (models.Forecast as Model<IForecast>) ||
  model<IForecast>('Forecast', forecastSchema);
