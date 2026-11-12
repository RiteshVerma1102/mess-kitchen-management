import { Schema, model, models, type Model, type Types } from 'mongoose';

export interface IDish {
  institutionId: string;
  name: string;
  category: 'main' | 'side' | 'bread' | 'rice' | 'dessert' | 'beverage' | 'snack';
  portionGrams: number;
  costPerPortionPaise: number; // integer paise, never float
  vegetarian: boolean;
  active: boolean;
}

export type DishDoc = IDish & { _id: Types.ObjectId; createdAt: Date; updatedAt: Date };

const dishSchema = new Schema<IDish>(
  {
    institutionId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, enum: ['main', 'side', 'bread', 'rice', 'dessert', 'beverage', 'snack'] },
    portionGrams: { type: Number, required: true, min: 1 },
    costPerPortionPaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    vegetarian: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
dishSchema.index({ institutionId: 1, name: 1 }, { unique: true });

export const DishModel: Model<IDish> = (models.Dish as Model<IDish>) || model<IDish>('Dish', dishSchema);
