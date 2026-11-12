import { Schema, model, models, type Model, type Types } from 'mongoose';

export interface IMealDishItem {
  dishId: Types.ObjectId;
  portionGrams: number;
  mandatory?: boolean;
  notes?: string;
}

export interface IMenu {
  institutionId: string;
  name: string;
  cycleType: 'weekly' | 'fortnightly' | 'monthly' | 'special_event';
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  effectiveDate?: string; // YYYY-MM-DD for date-bound menus
  messHallId?: string; // specific hall or 'all'
  status: 'draft' | 'published' | 'archived';
  meals: {
    breakfast: IMealDishItem[];
    lunch: IMealDishItem[];
    snacks: IMealDishItem[];
    dinner: IMealDishItem[];
  };
  specialNotice?: string;
  isSynthetic?: boolean;
}

export type MenuDoc = IMenu & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const mealDishItemSchema = new Schema<IMealDishItem>(
  {
    dishId: { type: Schema.Types.ObjectId, ref: 'Dish', required: true },
    portionGrams: { type: Number, required: true, min: 1 },
    mandatory: { type: Boolean, default: true },
    notes: { type: String, trim: true },
  },
  { _id: false },
);

const menuSchema = new Schema<IMenu>(
  {
    institutionId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    cycleType: {
      type: String,
      required: true,
      enum: ['weekly', 'fortnightly', 'monthly', 'special_event'],
      default: 'weekly',
    },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    effectiveDate: { type: String, trim: true },
    messHallId: { type: String, default: 'all', trim: true },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    meals: {
      breakfast: { type: [mealDishItemSchema], default: [] },
      lunch: { type: [mealDishItemSchema], default: [] },
      snacks: { type: [mealDishItemSchema], default: [] },
      dinner: { type: [mealDishItemSchema], default: [] },
    },
    specialNotice: { type: String, trim: true },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

menuSchema.index({ institutionId: 1, name: 1, dayOfWeek: 1 });
menuSchema.index({ institutionId: 1, status: 1 });
menuSchema.index({ institutionId: 1, effectiveDate: 1 });

export const MenuModel: Model<IMenu> =
  (models.Menu as Model<IMenu>) || model<IMenu>('Menu', menuSchema);
