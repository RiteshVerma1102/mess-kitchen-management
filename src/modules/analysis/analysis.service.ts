import { connectDb } from '@/lib/db';
import type { Session } from '@/core/auth/session';
import { PreparationPlanModel } from '@/modules/planning/plan.model';
import { IndentModel } from '@/modules/planning/indent.model';
import { ServiceActualModel } from '@/modules/actuals/actual.model';
import { FoodWasteModel, type FoodWasteDoc } from '@/modules/waste/waste.model';
import { ForecastModel } from '@/modules/forecasting/forecast.model';
import { MealConsumptionModel } from '@/modules/attendance/consumption.model';
import type { AnalyticsQuery, ReportExportQuery } from './analysis.schema';

export interface DailyTrendItem {
  date: string;
  plannedPortions: number;
  actualPrepared: number;
  mealsServed: number;
  leftoverPortions: number;
  wasteKg: number;
  wasteLossPaise: number;
  expenditurePaise: number;
  predictedCount: number;
}

export interface MealAnalyticsBreakdown {
  plannedPortions: number;
  actualPrepared: number;
  mealsServed: number;
  leftoverPortions: number;
  wasteKg: number;
  costPaise: number;
}

export interface ComprehensiveAnalytics {
  dateRange: { startDate: string; endDate: string };
  kpis: {
    totalFoodPrepared: number;
    totalMealsServed: number;
    totalFoodWasteKg: number;
    wastePercentage: number;
    estimatedWasteLossPaise: number;
    totalExpenditurePaise: number;
    costPerMealPaise: number;
    overallMape: number;
    overallMae: number;
    validForecastPoints: number;
  };
  mealBreakdown: Record<string, MealAnalyticsBreakdown>;
  dailyTrends: DailyTrendItem[];
  topWastedReasons: Array<{ reason: string; quantityKg: number; count: number }>;
  wasteCategoryDistribution: Record<string, number>;
}

export async function getComprehensiveAnalytics(
  session: Session,
  query: AnalyticsQuery,
): Promise<ComprehensiveAnalytics> {
  await connectDb();
  const { startDate, endDate, messHallId, mealType } = query;

  const baseFilter: Record<string, unknown> = {
    institutionId: session.institutionId,
  };
  if (messHallId) baseFilter.messHallId = messHallId;

  // 1. Fetch Plans
  const plansFilter = {
    ...baseFilter,
    serviceDate: { $gte: startDate, $lte: endDate },
    ...(mealType ? { mealType } : {}),
  };
  const plans = await PreparationPlanModel.find(plansFilter).lean();

  // 2. Fetch Actuals
  const actuals = await ServiceActualModel.find(plansFilter).lean();

  // 3. Fetch Food Waste
  const wasteRecords = await FoodWasteModel.find(plansFilter).lean();

  // 4. Fetch Indents for procurement expenditure
  const indents = await IndentModel.find({
    ...baseFilter,
    targetDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['approved', 'fulfilled'] },
  }).lean();

  // 5. Fetch Forecasts and Consumption for accuracy
  const forecasts = await ForecastModel.find(plansFilter).lean();
  const consumptions = await MealConsumptionModel.find({
    ...baseFilter,
    serviceDate: { $gte: startDate, $lte: endDate },
    ...(mealType ? { mealType } : {}),
  }).lean();

  // Initialize aggregates
  let totalFoodPrepared = 0;
  let totalMealsServed = 0;
  let totalLeftover = 0;
  let totalSpoiled = 0;
  let totalExpenditurePaise = 0;

  for (const act of actuals) {
    totalFoodPrepared += act.quantityPrepared;
    totalMealsServed += act.quantityServed;
    totalLeftover += act.quantityLeftover;
    totalSpoiled += act.quantitySpoiled || 0;
  }

  // Cost from plans or indents
  let totalPlanCostPaise = 0;
  for (const p of plans) {
    totalPlanCostPaise += p.totalEstimatedCostPaise || 0;
  }

  let totalIndentCostPaise = 0;
  for (const ind of indents) {
    totalIndentCostPaise += ind.totalAmountPaise || 0;
  }

  totalExpenditurePaise = totalIndentCostPaise > 0 ? totalIndentCostPaise : totalPlanCostPaise;

  // Waste Aggregates
  let totalFoodWasteKg = 0;
  let estimatedWasteLossPaise = 0;
  const wasteCategoryDistribution: Record<string, number> = {
    kitchen_prep: 0,
    unserved_leftover: 0,
    student_plate_waste: 0,
    spoilage: 0,
  };
  const reasonMap = new Map<string, { quantityKg: number; count: number }>();

  for (const w of wasteRecords) {
    totalFoodWasteKg += w.quantityKg;
    estimatedWasteLossPaise += w.financialLossPaise;
    wasteCategoryDistribution[w.wasteType] =
      (wasteCategoryDistribution[w.wasteType] || 0) + w.quantityKg;

    const r = reasonMap.get(w.reasonCode) || { quantityKg: 0, count: 0 };
    r.quantityKg += w.quantityKg;
    r.count += 1;
    reasonMap.set(w.reasonCode, r);
  }

  // Waste Percentage
  const wastePercentage =
    totalFoodPrepared > 0
      ? Number((((totalLeftover + totalSpoiled) / totalFoodPrepared) * 100).toFixed(1))
      : 0;

  // Cost Per Meal
  const costPerMealPaise =
    totalMealsServed > 0
      ? Math.round(totalExpenditurePaise / totalMealsServed)
      : totalFoodPrepared > 0
      ? Math.round(totalExpenditurePaise / totalFoodPrepared)
      : 0;

  // Forecast Accuracy (MAE & MAPE)
  let sumAbsoluteError = 0;
  let sumPercentageError = 0;
  let validForecastPoints = 0;

  const actualMap = new Map<string, number>();
  for (const c of consumptions) {
    actualMap.set(`${c.serviceDate}-${c.mealType}`, c.headcountEstimate);
  }

  for (const f of forecasts) {
    const key = `${f.targetDate}-${f.mealType}`;
    const actualCount = actualMap.get(key);

    if (typeof actualCount === 'number') {
      const absErr = Math.abs(actualCount - f.predictedCount);
      sumAbsoluteError += absErr;

      // Safe MAPE: Only divide when actualCount > 0
      if (actualCount > 0) {
        sumPercentageError += (absErr / actualCount) * 100;
        validForecastPoints++;
      }
    }
  }

  const overallMae =
    validForecastPoints > 0 ? Number((sumAbsoluteError / validForecastPoints).toFixed(1)) : 0;
  const overallMape =
    validForecastPoints > 0 ? Number((sumPercentageError / validForecastPoints).toFixed(1)) : 0;

  // Meal-wise Breakdown
  const mealBreakdown: Record<string, MealAnalyticsBreakdown> = {
    breakfast: { plannedPortions: 0, actualPrepared: 0, mealsServed: 0, leftoverPortions: 0, wasteKg: 0, costPaise: 0 },
    lunch: { plannedPortions: 0, actualPrepared: 0, mealsServed: 0, leftoverPortions: 0, wasteKg: 0, costPaise: 0 },
    snacks: { plannedPortions: 0, actualPrepared: 0, mealsServed: 0, leftoverPortions: 0, wasteKg: 0, costPaise: 0 },
    dinner: { plannedPortions: 0, actualPrepared: 0, mealsServed: 0, leftoverPortions: 0, wasteKg: 0, costPaise: 0 },
  };

  for (const p of plans) {
    if (mealBreakdown[p.mealType]) {
      mealBreakdown[p.mealType].plannedPortions += p.plannedPortions;
      mealBreakdown[p.mealType].costPaise += p.totalEstimatedCostPaise;
    }
  }

  for (const act of actuals) {
    if (mealBreakdown[act.mealType]) {
      mealBreakdown[act.mealType].actualPrepared += act.quantityPrepared;
      mealBreakdown[act.mealType].mealsServed += act.quantityServed;
      mealBreakdown[act.mealType].leftoverPortions += act.quantityLeftover;
    }
  }

  for (const w of wasteRecords) {
    if (mealBreakdown[w.mealType]) {
      mealBreakdown[w.mealType].wasteKg += w.quantityKg;
    }
  }

  // Daily Trends Timeline (group by date)
  const dateMap = new Map<string, DailyTrendItem>();

  const startD = new Date(startDate);
  const endD = new Date(endDate);
  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().slice(0, 10);
    dateMap.set(ds, {
      date: ds,
      plannedPortions: 0,
      actualPrepared: 0,
      mealsServed: 0,
      leftoverPortions: 0,
      wasteKg: 0,
      wasteLossPaise: 0,
      expenditurePaise: 0,
      predictedCount: 0,
    });
  }

  for (const p of plans) {
    const item = dateMap.get(p.serviceDate);
    if (item) {
      item.plannedPortions += p.plannedPortions;
      item.expenditurePaise += p.totalEstimatedCostPaise;
      item.predictedCount += p.forecastedHeadcount;
    }
  }

  for (const act of actuals) {
    const item = dateMap.get(act.serviceDate);
    if (item) {
      item.actualPrepared += act.quantityPrepared;
      item.mealsServed += act.quantityServed;
      item.leftoverPortions += act.quantityLeftover;
    }
  }

  for (const w of wasteRecords) {
    const item = dateMap.get(w.serviceDate);
    if (item) {
      item.wasteKg += w.quantityKg;
      item.wasteLossPaise += w.financialLossPaise;
    }
  }

  const dailyTrends = Array.from(dateMap.values()).map((t) => ({
    ...t,
    wasteKg: Number(t.wasteKg.toFixed(2)),
  }));

  const topWastedReasons = Array.from(reasonMap.entries())
    .map(([reason, data]) => ({
      reason,
      quantityKg: Number(data.quantityKg.toFixed(2)),
      count: data.count,
    }))
    .sort((a, b) => b.quantityKg - a.quantityKg);

  return {
    dateRange: { startDate, endDate },
    kpis: {
      totalFoodPrepared,
      totalMealsServed,
      totalFoodWasteKg: Number(totalFoodWasteKg.toFixed(2)),
      wastePercentage,
      estimatedWasteLossPaise,
      totalExpenditurePaise,
      costPerMealPaise,
      overallMape,
      overallMae,
      validForecastPoints,
    },
    mealBreakdown,
    dailyTrends,
    topWastedReasons,
    wasteCategoryDistribution,
  };
}

export async function generateReportCSV(
  session: Session,
  query: ReportExportQuery,
): Promise<{ filename: string; csvContent: string }> {
  await connectDb();
  const { type, startDate, endDate, messHallId } = query;

  if (type === 'waste_log') {
    const filter: Record<string, unknown> = {
      institutionId: session.institutionId,
      serviceDate: { $gte: startDate, $lte: endDate },
    };
    if (messHallId) filter.messHallId = messHallId;

    const records = await FoodWasteModel.find(filter)
      .sort({ serviceDate: 1, createdAt: 1 })
      .populate('dishId', 'name')
      .lean<FoodWasteDoc[]>();

    const rows = [
      ['Service Date', 'Mess Hall', 'Meal Type', 'Dish', 'Waste Category', 'Quantity (Kg)', 'Loss (INR)', 'Reason Code', 'Disposal Method', 'Notes'],
    ];

    for (const r of records) {
      rows.push([
        r.serviceDate,
        r.messHallId,
        r.mealType,
        (r.dishId as unknown as { name?: string })?.name || 'All Dishes',
        r.wasteType,
        r.quantityKg.toString(),
        (r.financialLossPaise / 100).toFixed(2),
        r.reasonCode,
        r.disposalMethod,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ]);
    }

    return {
      filename: `waste_log_${startDate}_to_${endDate}.csv`,
      csvContent: rows.map((r) => r.join(',')).join('\n'),
    };
  }

  // Daily Operations & Cost Summary
  const analytics = await getComprehensiveAnalytics(session, { startDate, endDate, messHallId });
  const rows = [
    ['Date', 'Planned Portions', 'Actual Prepared', 'Meals Served', 'Leftover Portions', 'Waste (Kg)', 'Financial Loss (INR)', 'Expenditure (INR)', 'Forecast Headcount'],
  ];

  for (const d of analytics.dailyTrends) {
    rows.push([
      d.date,
      d.plannedPortions.toString(),
      d.actualPrepared.toString(),
      d.mealsServed.toString(),
      d.leftoverPortions.toString(),
      d.wasteKg.toString(),
      (d.wasteLossPaise / 100).toFixed(2),
      (d.expenditurePaise / 100).toFixed(2),
      d.predictedCount.toString(),
    ]);
  }

  return {
    filename: `operations_summary_${startDate}_to_${endDate}.csv`,
    csvContent: rows.map((r) => r.join(',')).join('\n'),
  };
}
