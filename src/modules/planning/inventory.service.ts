import { Types } from 'mongoose';
import { connectDb } from '@/lib/db';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { writeAudit } from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import { IngredientModel, type IngredientDoc } from '@/modules/menus/ingredient.model';
import { StockMovementModel, type StockMovementDoc } from './stock-movement.model';
import { PreparationPlanModel } from './plan.model';
import { RecipeModel } from '@/modules/menus/recipe.model';
import type { StockAdjustmentInput } from './plan.schema';

export interface InventoryOverviewItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderThreshold: number;
  costPerUnitPaise: number;
  totalValuationPaise: number;
  reservedStock: number;
  availableStock: number;
  storageType: string;
  status: 'good' | 'low_stock' | 'out_of_stock';
  supplierName?: string;
}

export async function getInventoryOverview(
  session: Session,
  options?: { category?: string; status?: string; search?: string },
): Promise<{
  items: InventoryOverviewItem[];
  kpis: {
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValuationPaise: number;
  };
}> {
  await connectDb();

  const query: Record<string, unknown> = {
    institutionId: session.institutionId,
    active: true,
  };

  if (options?.category) {
    query.category = options.category;
  }

  if (options?.search) {
    query.name = { $regex: options.search, $options: 'i' };
  }

  const ingredients = await IngredientModel.find(query)
    .sort({ name: 1 })
    .populate('supplierId', 'name')
    .lean<Array<IngredientDoc & { supplierId?: { name: string } }>>();

  // Calculate reserved stock from today's approved/in_kitchen plans
  const today = new Date().toISOString().slice(0, 10);
  const activePlans = await PreparationPlanModel.find({
    institutionId: session.institutionId,
    serviceDate: today,
    status: { $in: ['approved', 'in_kitchen'] },
  }).lean();

  const reservedMap = new Map<string, number>();

  for (const plan of activePlans) {
    for (const item of plan.items) {
      const recipe = await RecipeModel.findOne({
        institutionId: session.institutionId,
        dishId: item.dishId,
      }).lean();

      if (recipe?.ingredients) {
        const scale = item.plannedPortions / (recipe.yieldPortions || 100);
        for (const ing of recipe.ingredients) {
          const ingIdStr = ing.ingredientId.toString();
          const gross = (ing.quantity * scale) / (1 - (ing.wastePercentage || 0) / 100);
          reservedMap.set(ingIdStr, (reservedMap.get(ingIdStr) || 0) + gross);
        }
      }
    }
  }

  let totalValuationPaise = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  const items: InventoryOverviewItem[] = [];

  for (const ing of ingredients) {
    const valuation = Math.round(ing.currentStock * ing.costPerUnitPaise);
    totalValuationPaise += valuation;

    const reserved = Number((reservedMap.get(ing._id.toString()) || 0).toFixed(2));
    const available = Number(Math.max(0, ing.currentStock - reserved).toFixed(2));

    let status: 'good' | 'low_stock' | 'out_of_stock' = 'good';
    if (ing.currentStock <= 0) {
      status = 'out_of_stock';
      outOfStockCount++;
    } else if (ing.currentStock <= ing.reorderThreshold) {
      status = 'low_stock';
      lowStockCount++;
    }

    if (options?.status && status !== options.status) {
      continue;
    }

    items.push({
      id: ing._id.toString(),
      name: ing.name,
      category: ing.category,
      unit: ing.unit,
      currentStock: ing.currentStock,
      reorderThreshold: ing.reorderThreshold,
      costPerUnitPaise: ing.costPerUnitPaise,
      totalValuationPaise: valuation,
      reservedStock: reserved,
      availableStock: available,
      storageType: ing.storageType,
      status,
      supplierName: ing.supplierId?.name,
    });
  }

  return {
    items,
    kpis: {
      totalItems: ingredients.length,
      lowStockCount,
      outOfStockCount,
      totalValuationPaise,
    },
  };
}

export async function adjustStock(
  session: Session,
  input: StockAdjustmentInput,
): Promise<{ ingredient: IngredientDoc; movement: StockMovementDoc }> {
  await connectDb();
  const { ingredientId, quantityChange, movementType, notes, referenceId } = input;

  const ing = await IngredientModel.findOne({
    _id: ingredientId,
    institutionId: session.institutionId,
  });

  if (!ing) throw new NotFoundError('Ingredient not found');

  const newStock = Number((ing.currentStock + quantityChange).toFixed(2));

  // Prevent negative inventory
  if (newStock < 0) {
    throw new ValidationError(
      `Insufficient stock. Current: ${ing.currentStock} ${ing.unit}, attempted deduction: ${Math.abs(quantityChange)} ${ing.unit}`,
    );
  }

  const previousStock = ing.currentStock;
  ing.currentStock = newStock;
  await ing.save();

  // Create movement record
  const movement = await StockMovementModel.create({
    institutionId: session.institutionId,
    ingredientId: ing._id,
    ingredientName: ing.name,
    movementType,
    quantity: quantityChange,
    balanceAfter: newStock,
    unit: ing.unit,
    referenceId,
    referenceType: 'audit_adjustment',
    recordedBy: session.userId,
    notes,
  });

  await writeAudit({
    session,
    action: 'inventory.adjust',
    target: { type: 'Ingredient', id: ing._id.toString() },
    before: { currentStock: previousStock },
    after: { currentStock: newStock, quantityChange, movementType },
  });

  return {
    ingredient: ing.toObject() as unknown as IngredientDoc,
    movement: movement.toObject() as unknown as StockMovementDoc,
  };
}

export async function getStockMovements(
  session: Session,
  ingredientId?: string,
  limit = 50,
): Promise<StockMovementDoc[]> {
  await connectDb();
  const query: Record<string, unknown> = {
    institutionId: session.institutionId,
  };

  if (ingredientId) {
    query.ingredientId = new Types.ObjectId(ingredientId);
  }

  const movements = await StockMovementModel.find(query)
    .sort({ recordedAt: -1 })
    .limit(limit)
    .lean<StockMovementDoc[]>();

  return movements;
}
