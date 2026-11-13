import { Types } from 'mongoose';
import { connectDb } from '@/lib/db';
import { writeAudit } from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import { FoodWasteModel, type FoodWasteDoc, type IFoodWaste } from './waste.model';
import type { RecordWasteInput, ListWasteQuery } from './waste.schema';

export interface WasteSummaryResponse {
  totalWasteKg: number;
  totalFinancialLossPaise: number;
  byCategory: Record<string, { quantityKg: number; financialLossPaise: number; count: number }>;
  byReason: Record<string, { quantityKg: number; count: number }>;
  byMeal: Record<string, { quantityKg: number; financialLossPaise: number }>;
}

export async function recordFoodWaste(
  session: Session,
  input: RecordWasteInput,
): Promise<FoodWasteDoc> {
  await connectDb();

  const waste = await FoodWasteModel.create({
    institutionId: session.institutionId,
    messHallId: input.messHallId,
    serviceDate: input.serviceDate,
    mealType: input.mealType,
    dishId: input.dishId ? new Types.ObjectId(input.dishId) : undefined,
    wasteType: input.wasteType,
    quantityKg: Number(input.quantityKg.toFixed(2)),
    financialLossPaise: input.financialLossPaise,
    reasonCode: input.reasonCode,
    disposalMethod: input.disposalMethod,
    notes: input.notes,
    recordedBy: session.userId,
  });

  await writeAudit({
    session,
    action: 'waste.record',
    target: { type: 'FoodWaste', id: waste._id.toString() },
    after: {
      messHallId: input.messHallId,
      serviceDate: input.serviceDate,
      quantityKg: input.quantityKg,
      financialLossPaise: input.financialLossPaise,
    },
  });

  return waste.toObject() as unknown as FoodWasteDoc;
}

export async function getFoodWasteList(
  session: Session,
  query: ListWasteQuery,
): Promise<{ items: FoodWasteDoc[]; total: number }> {
  await connectDb();

  const filter: Record<string, unknown> = {
    institutionId: session.institutionId,
  };

  if (query.startDate && query.endDate) {
    filter.serviceDate = { $gte: query.startDate, $lte: query.endDate };
  } else if (query.startDate) {
    filter.serviceDate = { $gte: query.startDate };
  } else if (query.endDate) {
    filter.serviceDate = { $lte: query.endDate };
  }

  if (query.messHallId) filter.messHallId = query.messHallId;
  if (query.mealType) filter.mealType = query.mealType;
  if (query.wasteType) filter.wasteType = query.wasteType;

  const total = await FoodWasteModel.countDocuments(filter);
  const items = await FoodWasteModel.find(filter)
    .sort({ serviceDate: -1, createdAt: -1 })
    .skip(query.skip)
    .limit(query.limit)
    .populate('dishId', 'name')
    .lean<FoodWasteDoc[]>();

  return { items, total };
}

export async function getWasteSummary(
  session: Session,
  startDate?: string,
  endDate?: string,
  messHallId?: string,
): Promise<WasteSummaryResponse> {
  await connectDb();

  const filter: Record<string, unknown> = {
    institutionId: session.institutionId,
  };

  if (startDate && endDate) {
    filter.serviceDate = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    filter.serviceDate = { $gte: startDate };
  } else if (endDate) {
    filter.serviceDate = { $lte: endDate };
  }

  if (messHallId) filter.messHallId = messHallId;

  const records = await FoodWasteModel.find(filter).lean<FoodWasteDoc[]>();

  let totalWasteKg = 0;
  let totalFinancialLossPaise = 0;

  const byCategory: Record<string, { quantityKg: number; financialLossPaise: number; count: number }> = {
    kitchen_prep: { quantityKg: 0, financialLossPaise: 0, count: 0 },
    unserved_leftover: { quantityKg: 0, financialLossPaise: 0, count: 0 },
    student_plate_waste: { quantityKg: 0, financialLossPaise: 0, count: 0 },
    spoilage: { quantityKg: 0, financialLossPaise: 0, count: 0 },
  };

  const byReason: Record<string, { quantityKg: number; count: number }> = {};
  const byMeal: Record<string, { quantityKg: number; financialLossPaise: number }> = {
    breakfast: { quantityKg: 0, financialLossPaise: 0 },
    lunch: { quantityKg: 0, financialLossPaise: 0 },
    snacks: { quantityKg: 0, financialLossPaise: 0 },
    dinner: { quantityKg: 0, financialLossPaise: 0 },
  };

  for (const r of records) {
    totalWasteKg += r.quantityKg;
    totalFinancialLossPaise += r.financialLossPaise;

    // by category
    if (!byCategory[r.wasteType]) {
      byCategory[r.wasteType] = { quantityKg: 0, financialLossPaise: 0, count: 0 };
    }
    byCategory[r.wasteType].quantityKg += r.quantityKg;
    byCategory[r.wasteType].financialLossPaise += r.financialLossPaise;
    byCategory[r.wasteType].count += 1;

    // by reason
    if (!byReason[r.reasonCode]) {
      byReason[r.reasonCode] = { quantityKg: 0, count: 0 };
    }
    byReason[r.reasonCode].quantityKg += r.quantityKg;
    byReason[r.reasonCode].count += 1;

    // by meal
    if (!byMeal[r.mealType]) {
      byMeal[r.mealType] = { quantityKg: 0, financialLossPaise: 0 };
    }
    byMeal[r.mealType].quantityKg += r.quantityKg;
    byMeal[r.mealType].financialLossPaise += r.financialLossPaise;
  }

  // Round values
  totalWasteKg = Number(totalWasteKg.toFixed(2));
  for (const key of Object.keys(byCategory)) {
    byCategory[key].quantityKg = Number(byCategory[key].quantityKg.toFixed(2));
  }
  for (const key of Object.keys(byReason)) {
    byReason[key].quantityKg = Number(byReason[key].quantityKg.toFixed(2));
  }
  for (const key of Object.keys(byMeal)) {
    byMeal[key].quantityKg = Number(byMeal[key].quantityKg.toFixed(2));
  }

  return {
    totalWasteKg,
    totalFinancialLossPaise,
    byCategory,
    byReason,
    byMeal,
  };
}
