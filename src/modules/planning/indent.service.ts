import { Types } from 'mongoose';
import { connectDb } from '@/lib/db';
import { NotFoundError, ValidationError, ConflictError } from '@/lib/errors';
import { writeAudit } from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import { IndentModel, type IIndent, type IIndentItem, type IndentDoc } from './indent.model';
import { StockMovementModel } from './stock-movement.model';
import { PreparationPlanModel } from './plan.model';
import { RecipeModel } from '@/modules/menus/recipe.model';
import { IngredientModel, type IngredientDoc } from '@/modules/menus/ingredient.model';
import type {
  CreateManualIndentInput,
  GenerateIndentFromShortagesInput,
  UpdateIndentStatusInput,
  ListIndentsQuery,
} from './plan.schema';

export async function generateIndentFromShortages(
  session: Session,
  input: GenerateIndentFromShortagesInput,
): Promise<IndentDoc> {
  await connectDb();
  const { messHallId, targetDate, supplierId, notes } = input;

  // 1. Prevent duplicate active indent for same date and hall
  const existingActive = await IndentModel.findOne({
    institutionId: session.institutionId,
    messHallId,
    targetDate,
    status: { $in: ['draft', 'submitted', 'approved'] },
  });

  if (existingActive) {
    throw new ConflictError(
      `An active indent (${existingActive.indentNumber}) already exists for ${targetDate} in hall ${messHallId}`,
    );
  }

  // 2. Aggregate ingredient requirements across all meals on target date
  const plans = await PreparationPlanModel.find({
    institutionId: session.institutionId,
    messHallId,
    serviceDate: targetDate,
  }).lean();

  const shortfallMap = new Map<string, {
    name: string;
    unit: string;
    requiredQty: number;
    currentStock: number;
    unitCostPaise: number;
  }>();

  for (const plan of plans) {
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

          const existing = shortfallMap.get(ingIdStr);
          if (existing) {
            existing.requiredQty += grossQty;
          } else {
            shortfallMap.set(ingIdStr, {
              name: ingDoc.name,
              unit: ingDoc.unit,
              requiredQty: grossQty,
              currentStock: ingDoc.currentStock,
              unitCostPaise: ingDoc.costPerUnitPaise,
            });
          }
        }
      }
    }
  }

  // If no plans found, also check ingredients below reorderThreshold
  if (shortfallMap.size === 0) {
    const lowStockIngredients = await IngredientModel.find({
      institutionId: session.institutionId,
      $expr: { $lte: ['$currentStock', '$reorderThreshold'] },
    }).lean<IngredientDoc[]>();

    for (const ing of lowStockIngredients) {
      const orderQty = Math.max(ing.reorderThreshold * 2, 20);
      shortfallMap.set(ing._id.toString(), {
        name: ing.name,
        unit: ing.unit,
        requiredQty: orderQty,
        currentStock: ing.currentStock,
        unitCostPaise: ing.costPerUnitPaise,
      });
    }
  }

  const indentItems: IIndentItem[] = [];
  let totalAmountPaise = 0;

  for (const [id, data] of shortfallMap.entries()) {
    const shortage = Math.max(0, Number((data.requiredQty - data.currentStock).toFixed(2)));
    const quantityToOrder = shortage > 0 ? shortage : (data.currentStock <= 5 ? 15 : 0);

    if (quantityToOrder > 0) {
      const itemCost = Math.round(quantityToOrder * data.unitCostPaise);
      totalAmountPaise += itemCost;
      indentItems.push({
        ingredientId: new Types.ObjectId(id),
        ingredientName: data.name,
        requestedQuantity: quantityToOrder,
        issuedQuantity: 0,
        unit: data.unit,
        unitCostPaise: data.unitCostPaise,
        totalCostPaise: itemCost,
      });
    }
  }

  if (indentItems.length === 0) {
    throw new ValidationError('All ingredients have sufficient stock for the scheduled preparation plan');
  }

  const count = await IndentModel.countDocuments({ institutionId: session.institutionId });
  const indentNumber = `IND-${targetDate.replace(/-/g, '')}-${String(count + 1).padStart(3, '0')}`;

  const indent = await IndentModel.create({
    institutionId: session.institutionId,
    indentNumber,
    messHallId,
    targetDate,
    supplierId: supplierId ? new Types.ObjectId(supplierId) : undefined,
    items: indentItems,
    totalAmountPaise,
    status: 'draft',
    requestedBy: session.userId,
    notes: notes || 'Auto-generated from daily preparation shortfall analysis',
  });

  await writeAudit({
    session,
    action: 'indent.generate',
    target: { type: 'Indent', id: indent._id.toString() },
    after: { indentNumber, targetDate, totalAmountPaise, itemsCount: indentItems.length },
  });

  return indent.toObject() as unknown as IndentDoc;
}

export async function createManualIndent(
  session: Session,
  input: CreateManualIndentInput,
): Promise<IndentDoc> {
  await connectDb();
  const { messHallId, targetDate, supplierId, notes, items } = input;

  const indentItems: IIndentItem[] = [];
  let totalAmountPaise = 0;

  for (const item of items) {
    const ingDoc = await IngredientModel.findOne({
      _id: item.ingredientId,
      institutionId: session.institutionId,
    }).lean<IngredientDoc>();

    if (!ingDoc) throw new NotFoundError(`Ingredient ${item.ingredientId} not found`);

    const itemTotal = Math.round(item.requestedQuantity * ingDoc.costPerUnitPaise);
    totalAmountPaise += itemTotal;

    indentItems.push({
      ingredientId: new Types.ObjectId(item.ingredientId),
      ingredientName: ingDoc.name,
      requestedQuantity: item.requestedQuantity,
      issuedQuantity: 0,
      unit: ingDoc.unit,
      unitCostPaise: ingDoc.costPerUnitPaise,
      totalCostPaise: itemTotal,
    });
  }

  const count = await IndentModel.countDocuments({ institutionId: session.institutionId });
  const indentNumber = `IND-${targetDate.replace(/-/g, '')}-${String(count + 1).padStart(3, '0')}`;

  const indent = await IndentModel.create({
    institutionId: session.institutionId,
    indentNumber,
    messHallId,
    targetDate,
    supplierId: supplierId ? new Types.ObjectId(supplierId) : undefined,
    items: indentItems,
    totalAmountPaise,
    status: 'draft',
    requestedBy: session.userId,
    notes,
  });

  await writeAudit({
    session,
    action: 'indent.create',
    target: { type: 'Indent', id: indent._id.toString() },
    after: { indentNumber, targetDate, totalAmountPaise },
  });

  return indent.toObject() as unknown as IndentDoc;
}

export async function updateIndentStatus(
  session: Session,
  indentId: string,
  input: UpdateIndentStatusInput,
): Promise<IndentDoc> {
  await connectDb();

  const indent = await IndentModel.findOne({
    _id: indentId,
    institutionId: session.institutionId,
  });

  if (!indent) throw new NotFoundError('Purchase indent not found');

  const beforeStatus = indent.status;
  const targetStatus = input.status;

  // Status transitions
  if (targetStatus === 'approved') {
    indent.status = 'approved';
    indent.approvedBy = session.userId;
  } else if (targetStatus === 'submitted') {
    indent.status = 'submitted';
  } else if (targetStatus === 'cancelled') {
    indent.status = 'cancelled';
  } else if (targetStatus === 'fulfilled') {
    // If fulfilled, update issued quantities and increment inventory
    indent.status = 'fulfilled';

    for (const item of indent.items) {
      const issuedQty =
        input.items?.find((i) => i.ingredientId.toString() === item.ingredientId.toString())
          ?.issuedQuantity ?? item.requestedQuantity;

      item.issuedQuantity = issuedQty;

      // Atomic increment on ingredient stock
      const updatedIng = await IngredientModel.findOneAndUpdate(
        { _id: item.ingredientId, institutionId: session.institutionId },
        { $inc: { currentStock: issuedQty } },
        { new: true },
      );

      // Record inward stock movement
      if (updatedIng) {
        await StockMovementModel.create({
          institutionId: session.institutionId,
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          movementType: 'inward_indent',
          quantity: issuedQty,
          balanceAfter: updatedIng.currentStock,
          unit: item.unit,
          referenceId: indent.indentNumber,
          referenceType: 'indent',
          recordedBy: session.userId,
          notes: `Fulfillment of purchase indent ${indent.indentNumber}`,
        });
      }
    }
  }

  if (input.notes) indent.notes = input.notes;

  await indent.save();

  await writeAudit({
    session,
    action: 'indent.updateStatus',
    target: { type: 'Indent', id: indent._id.toString() },
    before: { status: beforeStatus },
    after: { status: indent.status, approvedBy: indent.approvedBy },
  });

  return indent.toObject() as unknown as IndentDoc;
}

export async function getIndents(
  session: Session,
  query: ListIndentsQuery,
): Promise<{ indents: IndentDoc[]; total: number }> {
  await connectDb();
  const filter: Record<string, unknown> = {
    institutionId: session.institutionId,
  };

  if (query.targetDate) filter.targetDate = query.targetDate;
  if (query.messHallId) filter.messHallId = query.messHallId;
  if (query.status) filter.status = query.status;

  const total = await IndentModel.countDocuments(filter);
  const indents = await IndentModel.find(filter)
    .sort({ createdAt: -1 })
    .skip(query.skip)
    .limit(query.limit)
    .populate('supplierId', 'name contactPerson phone')
    .lean<IndentDoc[]>();

  return { indents, total };
}

export async function getIndentById(
  session: Session,
  indentId: string,
): Promise<IndentDoc> {
  await connectDb();
  const indent = await IndentModel.findOne({
    _id: indentId,
    institutionId: session.institutionId,
  })
    .populate('supplierId', 'name contactPerson phone email')
    .lean<IndentDoc>();

  if (!indent) throw new NotFoundError('Indent not found');
  return indent;
}
