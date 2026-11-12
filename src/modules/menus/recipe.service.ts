import { Types } from 'mongoose';
import { connectDb } from '@/lib/db';
import { ConflictError, NotFoundError } from '@/lib/errors';
import { writeAudit } from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import { RecipeModel, type RecipeDoc } from './recipe.model';
import { DishModel } from './dish.model';
import { IngredientModel, type IngredientDoc } from './ingredient.model';
import { recipeRepository } from './recipe.repository';
import type { CreateRecipeInput, UpdateRecipeInput, ListRecipeQuery } from './recipe.schema';

export async function createRecipe(session: Session, input: CreateRecipeInput, ip?: string): Promise<RecipeDoc> {
  await connectDb();
  const repo = recipeRepository(session.institutionId);

  // Verify dish exists
  const dish = await DishModel.findOne({
    institutionId: session.institutionId,
    _id: input.dishId,
  });
  if (!dish) {
    throw new NotFoundError('Dish not found');
  }

  // Check version conflict
  const existing = await RecipeModel.findOne({
    institutionId: session.institutionId,
    dishId: input.dishId,
    version: input.version,
  });
  if (existing) {
    throw new ConflictError(`Recipe version ${input.version} for this dish already exists`);
  }

  const formattedIngredients = input.ingredients.map((item) => ({
    ingredientId: new Types.ObjectId(item.ingredientId),
    quantity: item.quantity,
    unit: item.unit,
    wastePercentage: item.wastePercentage,
    preparationNotes: item.preparationNotes,
  }));

  const created = await repo.create({
    dishId: new Types.ObjectId(input.dishId),
    version: input.version,
    yieldPortions: input.yieldPortions,
    ingredients: formattedIngredients,
    instructions: input.instructions,
    cookingTimeMinutes: input.cookingTimeMinutes,
    isSynthetic: false,
  });

  const recipe = created as unknown as RecipeDoc;

  await writeAudit({
    session,
    ip,
    action: 'recipe.create',
    target: { type: 'Recipe', id: recipe._id.toString() },
    after: { dishId: input.dishId, version: recipe.version, yieldPortions: recipe.yieldPortions },
  });

  return recipe;
}

export async function updateRecipe(
  session: Session,
  recipeId: string,
  input: UpdateRecipeInput,
  ip?: string,
): Promise<RecipeDoc> {
  await connectDb();
  const repo = recipeRepository(session.institutionId);

  const existing = await repo.get(recipeId);
  if (!existing) {
    throw new NotFoundError('Recipe not found');
  }

  const updateData: Record<string, unknown> = {};
  if (input.version !== undefined) updateData.version = input.version;
  if (input.yieldPortions !== undefined) updateData.yieldPortions = input.yieldPortions;
  if (input.instructions !== undefined) updateData.instructions = input.instructions;
  if (input.cookingTimeMinutes !== undefined) updateData.cookingTimeMinutes = input.cookingTimeMinutes;

  if (input.ingredients) {
    updateData.ingredients = input.ingredients.map((item) => ({
      ingredientId: new Types.ObjectId(item.ingredientId),
      quantity: item.quantity,
      unit: item.unit,
      wastePercentage: item.wastePercentage,
      preparationNotes: item.preparationNotes,
    }));
  }

  const updated = await repo.update(recipeId, updateData);
  if (!updated) {
    throw new NotFoundError('Recipe not found after update');
  }

  const recipe = updated as unknown as RecipeDoc;

  await writeAudit({
    session,
    ip,
    action: 'recipe.update',
    target: { type: 'Recipe', id: recipeId },
    before: { version: existing.version, yieldPortions: existing.yieldPortions },
    after: { version: recipe.version, yieldPortions: recipe.yieldPortions },
  });

  return recipe;
}

export async function deleteRecipe(
  session: Session,
  recipeId: string,
  ip?: string,
): Promise<{ success: boolean; id: string }> {
  await connectDb();
  const repo = recipeRepository(session.institutionId);

  const existing = await repo.get(recipeId);
  if (!existing) {
    throw new NotFoundError('Recipe not found');
  }

  await repo.remove(recipeId);

  await writeAudit({
    session,
    ip,
    action: 'recipe.delete',
    target: { type: 'Recipe', id: recipeId },
    before: { dishId: String(existing.dishId), version: existing.version },
  });

  return { success: true, id: recipeId };
}

export async function listRecipes(
  session: Session,
  query: ListRecipeQuery,
): Promise<{ recipes: Record<string, unknown>[]; total: number; limit: number; skip: number }> {
  await connectDb();

  const filter: Record<string, unknown> = {
    institutionId: session.institutionId,
  };
  if (query.dishId) {
    filter.dishId = new Types.ObjectId(query.dishId);
  }

  const [recipes, total] = await Promise.all([
    RecipeModel.find(filter)
      .populate('dishId', 'name category costPerPortionPaise vegetarian')
      .populate('ingredients.ingredientId', 'name category unit costPerUnitPaise currentStock')
      .sort({ createdAt: -1 })
      .skip(query.skip)
      .limit(query.limit)
      .lean(),
    RecipeModel.countDocuments(filter),
  ]);

  return {
    recipes: recipes as unknown as Record<string, unknown>[],
    total,
    limit: query.limit,
    skip: query.skip,
  };
}

export async function getRecipeById(session: Session, recipeId: string): Promise<Record<string, unknown>> {
  await connectDb();
  const recipe = await RecipeModel.findOne({
    institutionId: session.institutionId,
    _id: recipeId,
  })
    .populate('dishId')
    .populate('ingredients.ingredientId')
    .lean();

  if (!recipe) {
    throw new NotFoundError('Recipe not found');
  }

  return recipe as unknown as Record<string, unknown>;
}

export async function getRecipeByDishId(session: Session, dishId: string): Promise<Record<string, unknown>> {
  await connectDb();
  const recipe = await RecipeModel.findOne({
    institutionId: session.institutionId,
    dishId: new Types.ObjectId(dishId),
  })
    .sort({ version: -1 })
    .populate('dishId')
    .populate('ingredients.ingredientId')
    .lean();

  if (!recipe) {
    throw new NotFoundError('No recipe found for this dish');
  }

  return recipe as unknown as Record<string, unknown>;
}

export interface CalculatedIngredientRequirement {
  ingredientId: string;
  name: string;
  category: string;
  unit: string;
  costPerUnitPaise: number;
  netQuantity: number;
  wastePercentage: number;
  grossQuantity: number;
  currentStock: number;
  shortfall: number;
  estimatedCostPaise: number;
  preparationNotes?: string;
}

export interface RequirementCalculationResult {
  recipeId: string;
  dish: {
    id: string;
    name: string;
    category: string;
  };
  requestedPortions: number;
  baseYieldPortions: number;
  scaleFactor: number;
  ingredients: CalculatedIngredientRequirement[];
  totalEstimatedCostPaise: number;
  estimatedCostPerPortionPaise: number;
}

export async function calculateIngredientRequirements(
  session: Session,
  recipeId: string,
  requestedPortions: number,
): Promise<RequirementCalculationResult> {
  await connectDb();

  const recipe = await RecipeModel.findOne({
    institutionId: session.institutionId,
    _id: recipeId,
  })
    .populate<{ dishId: { _id: Types.ObjectId; name: string; category: string } }>('dishId')
    .populate<{ ingredients: Array<{ ingredientId: IngredientDoc; quantity: number; unit: string; wastePercentage: number; preparationNotes?: string }> }>('ingredients.ingredientId')
    .lean();

  if (!recipe) {
    throw new NotFoundError('Recipe not found');
  }

  const scaleFactor = requestedPortions / recipe.yieldPortions;
  let totalEstimatedCostPaise = 0;

  const ingredients: CalculatedIngredientRequirement[] = [];

  for (const item of recipe.ingredients) {
    const ingDoc = item.ingredientId as unknown as IngredientDoc;
    if (!ingDoc) continue;

    const netQuantity = Number((item.quantity * scaleFactor).toFixed(3));
    const wasteFactor = item.wastePercentage > 0 ? 1 - item.wastePercentage / 100 : 1;
    const grossQuantity = Number((netQuantity / wasteFactor).toFixed(3));
    const costPerUnitPaise = ingDoc.costPerUnitPaise ?? 0;
    const estimatedCostPaise = Math.round(grossQuantity * costPerUnitPaise);
    const currentStock = ingDoc.currentStock ?? 0;
    const shortfall = Number(Math.max(0, grossQuantity - currentStock).toFixed(3));

    totalEstimatedCostPaise += estimatedCostPaise;

    ingredients.push({
      ingredientId: ingDoc._id.toString(),
      name: ingDoc.name,
      category: ingDoc.category,
      unit: item.unit,
      costPerUnitPaise,
      netQuantity,
      wastePercentage: item.wastePercentage,
      grossQuantity,
      currentStock,
      shortfall,
      estimatedCostPaise,
      preparationNotes: item.preparationNotes,
    });
  }

  const estimatedCostPerPortionPaise = requestedPortions > 0
    ? Math.round(totalEstimatedCostPaise / requestedPortions)
    : 0;

  return {
    recipeId: recipe._id.toString(),
    dish: {
      id: recipe.dishId?._id?.toString() ?? '',
      name: recipe.dishId?.name ?? 'Unknown Dish',
      category: recipe.dishId?.category ?? 'main',
    },
    requestedPortions,
    baseYieldPortions: recipe.yieldPortions,
    scaleFactor: Number(scaleFactor.toFixed(3)),
    ingredients,
    totalEstimatedCostPaise,
    estimatedCostPerPortionPaise,
  };
}
