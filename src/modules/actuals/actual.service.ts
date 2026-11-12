import { Types } from 'mongoose';
import { connectDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { writeAudit } from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import { ServiceActualModel, type ServiceActualDoc } from './actual.model';
import { DishModel } from '@/modules/menus/dish.model';
import { PreparationPlanModel } from '@/modules/planning/plan.model';
import { StockMovementModel } from '@/modules/planning/stock-movement.model';
import { IngredientModel } from '@/modules/menus/ingredient.model';
import type { RecordActualInput, ListActualsQuery } from './actual.schema';

export interface KitchenVarianceItem {
  mealType: string;
  dishId: string;
  dishName: string;
  plannedPortions: number;
  quantityPrepared: number;
  quantityServed: number;
  quantityLeftover: number;
  quantitySpoiled: number;
  variancePortions: number;
  variancePercentage: number;
}

export async function recordKitchenActual(
  session: Session,
  input: RecordActualInput,
): Promise<ServiceActualDoc> {
  await connectDb();
  const {
    messHallId,
    serviceDate,
    mealType,
    dishId,
    quantityPrepared,
    quantityServed,
    quantityLeftover,
    quantitySpoiled = 0,
    unit = 'portion',
    notes,
    ingredientConsumption,
  } = input;

  const dish = await DishModel.findById(dishId).lean();
  if (!dish) throw new NotFoundError('Dish not found');

  // Look up planned portions for variance comparison
  const plan = await PreparationPlanModel.findOne({
    institutionId: session.institutionId,
    messHallId,
    serviceDate,
    mealType,
  }).lean();

  const planItem = plan?.items?.find((i) => i.dishId.toString() === dishId.toString());
  const plannedPortions = planItem?.plannedPortions ?? plan?.plannedPortions ?? quantityPrepared;

  const variancePortions = quantityPrepared - plannedPortions;
  const variancePercentage =
    plannedPortions > 0
      ? Number(((variancePortions / plannedPortions) * 100).toFixed(1))
      : 0;

  const filter = {
    institutionId: session.institutionId,
    messHallId,
    serviceDate,
    mealType,
    dishId: new Types.ObjectId(dishId),
  };

  const update = {
    dishName: dish.name,
    plannedPortions,
    quantityPrepared,
    quantityServed,
    quantityLeftover,
    quantitySpoiled,
    variancePercentage,
    unit,
    notes,
    recordedBy: session.userId,
    recordedAt: new Date(),
    ingredientConsumption: ingredientConsumption?.map((c) => ({
      ingredientId: new Types.ObjectId(c.ingredientId),
      ingredientName: c.ingredientName,
      quantityConsumed: c.quantityConsumed,
      unit: c.unit,
    })),
  };

  const actual = await ServiceActualModel.findOneAndUpdate(
    filter,
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // If specific ingredient consumption was logged, deduct from stock and record outward movements
  if (ingredientConsumption && ingredientConsumption.length > 0) {
    for (const item of ingredientConsumption) {
      if (item.quantityConsumed > 0) {
        const ing = await IngredientModel.findOneAndUpdate(
          {
            _id: item.ingredientId,
            institutionId: session.institutionId,
            currentStock: { $gte: item.quantityConsumed }, // prevent negative inventory
          },
          { $inc: { currentStock: -item.quantityConsumed } },
          { new: true },
        );

        if (ing) {
          await StockMovementModel.create({
            institutionId: session.institutionId,
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            movementType: 'outward_kitchen',
            quantity: -item.quantityConsumed,
            balanceAfter: ing.currentStock,
            unit: item.unit,
            referenceId: `${serviceDate}-${mealType}`,
            referenceType: 'preparation_plan',
            recordedBy: session.userId,
            notes: `Consumed for ${dish.name} (${mealType})`,
          });
        }
      }
    }
  }

  await writeAudit({
    session,
    action: 'actual.record',
    target: { type: 'ServiceActual', id: actual._id.toString() },
    after: {
      messHallId,
      serviceDate,
      mealType,
      dishName: dish.name,
      quantityPrepared,
      quantityServed,
      quantityLeftover,
    },
  });

  return actual.toObject() as unknown as ServiceActualDoc;
}

export async function getKitchenActuals(
  session: Session,
  query: ListActualsQuery,
): Promise<ServiceActualDoc[]> {
  await connectDb();
  const filter: Record<string, unknown> = {
    institutionId: session.institutionId,
    serviceDate: query.serviceDate,
  };

  if (query.messHallId) filter.messHallId = query.messHallId;
  if (query.mealType) filter.mealType = query.mealType;

  return ServiceActualModel.find(filter)
    .sort({ mealType: 1, dishName: 1 })
    .lean<ServiceActualDoc[]>();
}

export async function getKitchenVarianceSummary(
  session: Session,
  messHallId: string,
  serviceDate: string,
): Promise<{
  serviceDate: string;
  messHallId: string;
  items: KitchenVarianceItem[];
  totals: {
    totalPlanned: number;
    totalPrepared: number;
    totalServed: number;
    totalLeftover: number;
    totalSpoiled: number;
    overallVariancePercentage: number;
  };
}> {
  await connectDb();

  const actuals = await ServiceActualModel.find({
    institutionId: session.institutionId,
    messHallId,
    serviceDate,
  }).lean<ServiceActualDoc[]>();

  const plans = await PreparationPlanModel.find({
    institutionId: session.institutionId,
    messHallId,
    serviceDate,
  }).lean();

  const items: KitchenVarianceItem[] = [];
  let totalPlanned = 0;
  let totalPrepared = 0;
  let totalServed = 0;
  let totalLeftover = 0;
  let totalSpoiled = 0;

  for (const act of actuals) {
    const planned = act.plannedPortions || 0;
    const diff = act.quantityPrepared - planned;
    const pct = planned > 0 ? Number(((diff / planned) * 100).toFixed(1)) : 0;

    totalPlanned += planned;
    totalPrepared += act.quantityPrepared;
    totalServed += act.quantityServed;
    totalLeftover += act.quantityLeftover;
    totalSpoiled += act.quantitySpoiled || 0;

    items.push({
      mealType: act.mealType,
      dishId: act.dishId.toString(),
      dishName: act.dishName,
      plannedPortions: planned,
      quantityPrepared: act.quantityPrepared,
      quantityServed: act.quantityServed,
      quantityLeftover: act.quantityLeftover,
      quantitySpoiled: act.quantitySpoiled || 0,
      variancePortions: diff,
      variancePercentage: pct,
    });
  }

  // Also include planned items that haven't been prepared yet
  for (const plan of plans) {
    for (const planItem of plan.items) {
      const alreadyHasActual = items.some(
        (i) => i.dishId === planItem.dishId.toString() && i.mealType === plan.mealType,
      );
      if (!alreadyHasActual) {
        totalPlanned += planItem.plannedPortions;
        items.push({
          mealType: plan.mealType,
          dishId: planItem.dishId.toString(),
          dishName: planItem.dishName,
          plannedPortions: planItem.plannedPortions,
          quantityPrepared: 0,
          quantityServed: 0,
          quantityLeftover: 0,
          quantitySpoiled: 0,
          variancePortions: -planItem.plannedPortions,
          variancePercentage: -100,
        });
      }
    }
  }

  const overallVariancePercentage =
    totalPlanned > 0
      ? Number((((totalPrepared - totalPlanned) / totalPlanned) * 100).toFixed(1))
      : 0;

  return {
    serviceDate,
    messHallId,
    items,
    totals: {
      totalPlanned,
      totalPrepared,
      totalServed,
      totalLeftover,
      totalSpoiled,
      overallVariancePercentage,
    },
  };
}
