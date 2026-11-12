import { Schema, model, models, type Model, type Types } from 'mongoose';
import type { IngredientUnit } from './ingredient.model';

export interface IRecipeItem {
  ingredientId: Types.ObjectId;
  quantity: number;
  unit: IngredientUnit;
  wastePercentage: number; // e.g. 10 for 10% peeling/trimming loss
  preparationNotes?: string;
}

export interface IRecipe {
  institutionId: string;
  dishId: Types.ObjectId;
  version: number;
  yieldPortions: number; // baseline portion count (e.g. 100)
  ingredients: IRecipeItem[];
  instructions?: string;
  cookingTimeMinutes?: number;
  isSynthetic?: boolean;
}

export type RecipeDoc = IRecipe & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const recipeItemSchema = new Schema<IRecipeItem>(
  {
    ingredientId: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unit: {
      type: String,
      required: true,
      enum: ['kg', 'g', 'l', 'ml', 'piece', 'packet', 'dozen'],
    },
    wastePercentage: { type: Number, default: 0, min: 0, max: 100 },
    preparationNotes: { type: String, trim: true },
  },
  { _id: false },
);

const recipeSchema = new Schema<IRecipe>(
  {
    institutionId: { type: String, required: true, index: true },
    dishId: { type: Schema.Types.ObjectId, ref: 'Dish', required: true, index: true },
    version: { type: Number, default: 1, min: 1 },
    yieldPortions: { type: Number, required: true, min: 1, default: 100 },
    ingredients: { type: [recipeItemSchema], default: [] },
    instructions: { type: String, trim: true },
    cookingTimeMinutes: { type: Number, min: 0 },
    isSynthetic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

recipeSchema.index({ institutionId: 1, dishId: 1, version: 1 }, { unique: true });

export const RecipeModel: Model<IRecipe> =
  (models.Recipe as Model<IRecipe>) || model<IRecipe>('Recipe', recipeSchema);
