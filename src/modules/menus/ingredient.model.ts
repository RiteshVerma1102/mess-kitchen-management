import { Schema, model, models, type Model, type Types } from 'mongoose';

export type IngredientUnit = 'kg' | 'g' | 'l' | 'ml' | 'piece' | 'packet' | 'dozen';

export interface IIngredient {
  institutionId: string;
  name: string;
  category: 'grain' | 'pulse' | 'vegetable' | 'dairy' | 'spice' | 'oil' | 'poultry' | 'bakery' | 'dry_ration' | 'other';
  unit: IngredientUnit;
  costPerUnitPaise: number; // integer paise, e.g. 4500 = ₹45.00
  currentStock: number;
  reorderThreshold: number;
  shelfLifeDays: number;
  storageType: 'dry' | 'cold_storage' | 'deep_freezer' | 'ambient';
  supplierId?: Types.ObjectId;
  active: boolean;
  isSynthetic?: boolean;
}

export type IngredientDoc = IIngredient & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const ingredientSchema = new Schema<IIngredient>(
  {
    institutionId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
      type: String,
      required: true,
      enum: ['grain', 'pulse', 'vegetable', 'dairy', 'spice', 'oil', 'poultry', 'bakery', 'dry_ration', 'other'],
    },
    unit: {
      type: String,
      required: true,
      enum: ['kg', 'g', 'l', 'ml', 'piece', 'packet', 'dozen'],
    },
    costPerUnitPaise: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    currentStock: { type: Number, required: true, min: 0, default: 0 },
    reorderThreshold: { type: Number, required: true, min: 0, default: 10 },
    shelfLifeDays: { type: Number, required: true, min: 1, default: 7 },
    storageType: {
      type: String,
      required: true,
      enum: ['dry', 'cold_storage', 'deep_freezer', 'ambient'],
      default: 'dry',
    },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    active: { type: Boolean, default: true },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ingredientSchema.index({ institutionId: 1, name: 1 }, { unique: true });
ingredientSchema.index({ institutionId: 1, category: 1 });

export const IngredientModel: Model<IIngredient> =
  (models.Ingredient as Model<IIngredient>) || model<IIngredient>('Ingredient', ingredientSchema);
