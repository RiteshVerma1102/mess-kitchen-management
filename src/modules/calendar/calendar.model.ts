import { Schema, model, models, type Model, type Types } from 'mongoose';
import type { MealType } from '@/modules/attendance/attendance.model';

export type CalendarEventType =
  | 'holiday'
  | 'exam'
  | 'fest'
  | 'vacation'
  | 'sports'
  | 'regular'
  | 'special_meal';

export interface ICalendarEvent {
  institutionId: string;
  date: string; // YYYY-MM-DD
  title: string;
  eventType: CalendarEventType;
  impactMultiplier: number; // e.g. 0.3 for holiday, 1.25 for fest, 1.0 for normal
  affectedMeals: MealType[];
  messHallId: string; // 'all' or specific hall ID
  description?: string;
  isSynthetic?: boolean;
}

export type CalendarEventDoc = ICalendarEvent & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const calendarEventSchema = new Schema<ICalendarEvent>(
  {
    institutionId: { type: String, required: true, index: true },
    date: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    eventType: {
      type: String,
      required: true,
      enum: ['holiday', 'exam', 'fest', 'vacation', 'sports', 'regular', 'special_meal'],
      default: 'regular',
    },
    impactMultiplier: { type: Number, required: true, min: 0, max: 3, default: 1.0 },
    affectedMeals: {
      type: [String],
      enum: ['breakfast', 'lunch', 'snacks', 'dinner'],
      default: ['breakfast', 'lunch', 'snacks', 'dinner'],
    },
    messHallId: { type: String, default: 'all', trim: true },
    description: { type: String, trim: true },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

calendarEventSchema.index({ institutionId: 1, date: 1 });
calendarEventSchema.index({ institutionId: 1, eventType: 1 });

export const CalendarEventModel: Model<ICalendarEvent> =
  (models.CalendarEvent as Model<ICalendarEvent>) ||
  model<ICalendarEvent>('CalendarEvent', calendarEventSchema);
