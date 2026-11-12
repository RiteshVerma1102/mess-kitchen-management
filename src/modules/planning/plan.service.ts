import { Types } from 'mongoose';
import { connectDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { writeAudit } from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import type { MealType } from '@/modules/attendance/attendance.model';
import { PreparationPlanModel, type IPreparationPlan, type IPlanItem, type PreparationPlanDoc } from './plan.model';
import { generateSingleMealForecast } from '@/modules/forecasting/forecast.service';
import { getMenuByDate } from '@/modules/menus/menu.service';
import { DishModel, type DishDoc } from '@/modules/menus/dish.model';
import { RecipeModel } from '@/modules/menus/recipe.model';
import { IngredientModel, type IngredientDoc } from '@/modules/menus/ingredient.model';
import type {
  GeneratePlanInput,
  UpdatePlanInput,
  ListPlansQuery,
} from './plan.schema';

export interface PlanIngredientRequirement {
  ingredientId: string;
  name: string;
  category: string;
  unit: string;
  grossRequiredQty: number;
  currentStock: number;
  shortfall: number;
  estimatedCostPaise: number;
  associatedDishes: string[];
}

export async function generateDailyKitchenPlan(
  session: Session,
  input: GeneratePlanInput,
): Promise<PreparationPlanDoc> {
  await connectDb();
  const { messHallId, serviceDate, mealType, bufferPercentage = 5 } = input;

  // 1. Fetch forecast for the target meal & date
  const forecast = await generateSingleMealForecast(session, messHallId, serviceDate, mealType);
  const forecastedHeadcount = forecast.predictedCount;
  const plannedPortions = Math.ceil(forecastedHeadcount * (1 + bufferPercentage / 100));

  // 2. Fetch active menu
  const menu = await getMenuByDate(session, serviceDate, messHallId);
  const mealsRecord = (menu?.meals || {}) as Record<string, unknown>;
  const mealDishes = mealsRecord[mealType] as
    | Array<{ dishId: { _id?: Types.ObjectId; name?: string } | Types.ObjectId; portionGrams: number }>
    | undefined;

  const planItems: IPlanItem[] = [];
  let totalEstimatedCostPaise = 0;

  if (mealDishes && mealDishes.length > 0) {
    for (const item of mealDishes) {
      const dishIdObj =
        typeof item.dishId === 'object' && item.dishId !== null && '_id' in item.dishId
          ? item.dishId._id
          : (item.dishId as Types.ObjectId);

      if (!dishIdObj) continue;

      const dish = await DishModel.findById(dishIdObj).lean<DishDoc>();
      const dishName = dish?.name || (typeof item.dishId === 'object' && 'name' in item.dishId ? (item.dishId as { name: string }).name : 'Dish');

      // Fetch recipe to calculate estimated cost per portion
      const recipe = await RecipeModel.findOne({
        institutionId: session.institutionId,
        dishId: dishIdObj,
      }).lean();

      let dishCostPerPortionPaise = 0;
      if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
        let recipeTotalCost = 0;
        for (const ing of recipe.ingredients) {
          const ingDoc = await IngredientModel.findById(ing.ingredientId).lean<IngredientDoc>();
          if (ingDoc) {
            const cost = (ing.quantity * ingDoc.costPerUnitPaise) / (1 - (ing.wastePercentage || 0) / 100);
            recipeTotalCost += cost;
          }
        }
        const yieldPortions = recipe.yieldPortions || 100;
        dishCostPerPortionPaise = Math.round(recipeTotalCost / yieldPortions);
      } else {
        // Fallback standard cost per portion (₹35)
        dishCostPerPortionPaise = 3500;
      }

      const estimatedCostPaise = Math.round(dishCostPerPortionPaise * plannedPortions);
      totalEstimatedCostPaise += estimatedCostPaise;

      planItems.push({
        dishId: new Types.ObjectId(dishIdObj.toString()),
        dishName,
        plannedPortions,
        estimatedCostPaise,
        prepNotes: `Standard portion allocation (${item.portionGrams || 150}g)`,
      });
    }
  }

  // If no dishes defined in menu, insert placeholder item so kitchen has visibility
  if (planItems.length === 0) {
    const defaultCost = Math.round(plannedPortions * 3000); // ₹30/portion
    totalEstimatedCostPaise = defaultCost;
    planItems.push({
      dishId: new Types.ObjectId(),
      dishName: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Standard Service`,
      plannedPortions,
      estimatedCostPaise: defaultCost,
      prepNotes: 'Menu not finalized, using baseline standard portioning',
    });
  }

  // 3. Upsert preparation plan document
  const filter = {
    institutionId: session.institutionId,
    messHallId,
    serviceDate,
    mealType,
  };

  const update: Partial<IPreparationPlan> = {
    forecastedHeadcount,
    bufferPercentage,
    plannedPortions,
    items: planItems,
    totalEstimatedCostPaise,
    status: 'draft',
  };

  const plan = await PreparationPlanModel.findOneAndUpdate(
    filter,
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await writeAudit({
    session,
    action: 'plan.generate',
    target: { type: 'PreparationPlan', id: plan._id.toString() },
    after: { messHallId, serviceDate, mealType, plannedPortions, totalEstimatedCostPaise },
  });

  return plan.toObject() as unknown as PreparationPlanDoc;
}

export async function getDailyKitchenPlans(
  session: Session,
  query: ListPlansQuery,
): Promise<PreparationPlanDoc[]> {
  await connectDb();
  const filter: Record<string, unknown> = {
    institutionId: session.institutionId,
    serviceDate: query.serviceDate,
  };

  if (query.messHallId) filter.messHallId = query.messHallId;
  if (query.mealType) filter.mealType = query.mealType;
  if (query.status) filter.status = query.status;

  const plans = await PreparationPlanModel.find(filter)
    .sort({ mealType: 1 })
    .lean<PreparationPlanDoc[]>();

  return plans;
}

export async function getPlanWithRequirements(
  session: Session,
  planId: string,
): Promise<{
  plan: PreparationPlanDoc;
  requirements: PlanIngredientRequirement[];
  totalShortfallCostPaise: number;
}> {
  await connectDb();
  const plan = await PreparationPlanModel.findOne({
    _id: planId,
    institutionId: session.institutionId,
  }).lean<PreparationPlanDoc>();

  if (!plan) throw new NotFoundError('Preparation plan not found');

  const ingMap = new Map<string, {
    name: string;
    category: string;
    unit: string;
    grossRequiredQty: number;
    currentStock: number;
    costPerUnitPaise: number;
    dishes: Set<string>;
  }>();

  for (const item of plan.items) {
    const recipe = await RecipeModel.findOne({
      institutionId: session.institutionId,
      dishId: item.dishId,
    }).lean();

    if (recipe && recipe.ingredients) {
      const scale = item.plannedPortions / (recipe.yieldPortions || 100);

      for (const ing of recipe.ingredients) {
        const ingDoc = await IngredientModel.findById(ing.ingredientId).lean<IngredientDoc>();
        if (!ingDoc) continue;

        const netQty = ing.quantity * scale;
        const wasteFactor = ing.wastePercentage > 0 ? 1 - ing.wastePercentage / 100 : 1;
        const grossQty = netQty / wasteFactor;
        const ingIdStr = ingDoc._id.toString();

        const existing = ingMap.get(ingIdStr);
        if (existing) {
          existing.grossRequiredQty += grossQty;
          existing.dishes.add(item.dishName);
        } else {
          ingMap.set(ingIdStr, {
            name: ingDoc.name,
            category: ingDoc.category,
            unit: ingDoc.unit,
            grossRequiredQty: grossQty,
            currentStock: ingDoc.currentStock,
            costPerUnitPaise: ingDoc.costPerUnitPaise,
            dishes: new Set([item.dishName]),
          });
        }
      }
    }
  }

  const requirements: PlanIngredientRequirement[] = [];
  let totalShortfallCostPaise = 0;

  for (const [id, data] of ingMap.entries()) {
    const grossRequired = Number(data.grossRequiredQty.toFixed(2));
    const shortfall = Math.max(0, Number((grossRequired - data.currentStock).toFixed(2)));
    const estimatedCost = Math.round(shortfall * data.costPerUnitPaise);
    totalShortfallCostPaise += estimatedCost;

    requirements.push({
      ingredientId: id,
      name: data.name,
      category: data.category,
      unit: data.unit,
      grossRequiredQty: grossRequired,
      currentStock: data.currentStock,
      shortfall,
      estimatedCostPaise: estimatedCost,
      associatedDishes: Array.from(data.dishes),
    });
  }

  return {
    plan,
    requirements,
    totalShortfallCostPaise,
  };
}

export async function updatePreparationPlan(
  session: Session,
  planId: string,
  input: UpdatePlanInput,
): Promise<PreparationPlanDoc> {
  await connectDb();

  const plan = await PreparationPlanModel.findOne({
    _id: planId,
    institutionId: session.institutionId,
  });

  if (!plan) throw new NotFoundError('Preparation plan not found');

  const before = plan.toObject();

  if (input.status) {
    plan.status = input.status;
    if (input.status === 'approved') {
      plan.approvedBy = session.userId;
    }
  }

  if (typeof input.bufferPercentage === 'number') {
    plan.bufferPercentage = input.bufferPercentage;
    plan.plannedPortions = Math.ceil(
      plan.forecastedHeadcount * (1 + plan.bufferPercentage / 100),
    );
    // rescale plan items
    for (const item of plan.items) {
      item.plannedPortions = plan.plannedPortions;
    }
  }

  if (typeof input.plannedPortions === 'number') {
    plan.plannedPortions = input.plannedPortions;
    for (const item of plan.items) {
      item.plannedPortions = input.plannedPortions;
    }
  }

  await plan.save();

  await writeAudit({
    session,
    action: 'plan.update',
    target: { type: 'PreparationPlan', id: plan._id.toString() },
    before: { status: before.status, plannedPortions: before.plannedPortions },
    after: { status: plan.status, plannedPortions: plan.plannedPortions },
  });

  return plan.toObject() as unknown as PreparationPlanDoc;
}
