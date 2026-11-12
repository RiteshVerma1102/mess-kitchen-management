import { Types } from 'mongoose';
import { connectDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { writeAudit } from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import type { MealType } from '@/modules/attendance/attendance.model';
import { MealConsumptionModel } from '@/modules/attendance/consumption.model';
import { StudentModel } from '@/modules/students/student.model';
import { CalendarEventModel } from '@/modules/calendar/calendar.model';
import { getMenuByDate } from '@/modules/menus/menu.service';
import { RecipeModel } from '@/modules/menus/recipe.model';
import { IngredientModel, type IngredientDoc } from '@/modules/menus/ingredient.model';
import { ForecastModel, type ForecastDoc, type IForecast } from './forecast.model';
import type {
  DailyForecastQuery,
  IngredientForecastQuery,
  ForecastHistoryQuery,
  OverrideForecastInput,
} from './forecast.schema';

const DEFAULT_BUFFER_PERCENTAGE = 8; // 8% kitchen safety margin

export interface SingleMealForecastResult {
  targetDate: string;
  mealType: MealType;
  messHallId: string;
  predictedCount: number;
  lowerBound: number;
  upperBound: number;
  confidenceLevel: number;
  recommendedPortions: number;
  bufferPercentage: number;
  dataPointsCount: number;
  historicalMean: number;
  historicalStdDev: number;
  calendarMultiplier: number;
  explanation: string;
  overridden: boolean;
  overrideCount?: number;
  overrideReason?: string;
  forecastId?: string;
}

export async function generateSingleMealForecast(
  session: Session,
  messHallId: string,
  targetDate: string,
  mealType: MealType,
): Promise<SingleMealForecastResult> {
  await connectDb();

  const targetDateObj = new Date(`${targetDate}T12:00:00Z`);
  const targetDow = targetDateObj.getUTCDay(); // 0 = Sun ... 6 = Sat
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // 1. Fetch 8 weeks of historical meal consumption for same hall and mealType
  const eightWeeksAgo = new Date(targetDateObj.getTime() - 56 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const rawHistory = await MealConsumptionModel.find({
    institutionId: session.institutionId,
    messHallId,
    mealType,
    serviceDate: { $gte: eightWeeksAgo, $lt: targetDate },
  }).sort({ serviceDate: -1 }).lean();

  // Filter to records matching the exact same day-of-week
  const sameDowHistory = rawHistory.filter((rec) => {
    const d = new Date(`${rec.serviceDate}T12:00:00Z`);
    return d.getUTCDay() === targetDow;
  });

  const counts = sameDowHistory.map((h) => h.totalSwipes || h.headcountEstimate || 0).filter((c) => c > 0);

  let historicalMean = 0;
  let historicalStdDev = 0;
  let dataPointsCount = counts.length;
  let methodologyNote = '';

  if (counts.length >= 2) {
    // True sample mean and sample standard deviation
    const sum = counts.reduce((acc, val) => acc + val, 0);
    historicalMean = Math.round(sum / counts.length);

    const variance =
      counts.reduce((acc, val) => acc + Math.pow(val - historicalMean, 2), 0) / (counts.length - 1);
    historicalStdDev = Math.round(Math.sqrt(variance));
    methodologyNote = `Calculated from ${counts.length} matching ${dayNames[targetDow]} records over the past 8 weeks.`;
  } else if (counts.length === 1) {
    historicalMean = counts[0];
    historicalStdDev = Math.round(counts[0] * 0.10);
    methodologyNote = `Based on 1 available ${dayNames[targetDow]} historical record with a 10% standard deviation estimate.`;
  } else {
    // Fallback: use active enrolled student population
    const activeStudents = await StudentModel.countDocuments({
      institutionId: session.institutionId,
      messHallId,
      mealPlanStatus: 'active',
    });

    const baseCount = activeStudents > 0 ? activeStudents : 400;
    // Meal turnout benchmarks
    const turnoutRatio =
      mealType === 'breakfast' ? 0.65 : mealType === 'lunch' ? 0.88 : mealType === 'dinner' ? 0.82 : 0.45;

    historicalMean = Math.round(baseCount * turnoutRatio);
    historicalStdDev = Math.round(historicalMean * 0.12);
    methodologyNote = `Baseline estimate derived from ${activeStudents || 'default'} enrolled hostel residents with standard ${Math.round(turnoutRatio * 100)}% ${mealType} attendance factor (no historical records yet).`;
  }

  // 2. Fetch Calendar Events for impact multiplier
  const calendarEvents = await CalendarEventModel.find({
    institutionId: session.institutionId,
    date: targetDate,
    ...(messHallId !== 'all' ? { $or: [{ messHallId }, { messHallId: 'all' }] } : {}),
  }).lean();

  let calendarMultiplier = 1.0;
  const eventNotes: string[] = [];

  for (const ev of calendarEvents) {
    if (ev.affectedMeals.includes(mealType) && ev.impactMultiplier !== undefined) {
      calendarMultiplier = Math.min(calendarMultiplier, ev.impactMultiplier);
      eventNotes.push(`${ev.title} (${ev.eventType}: ${ev.impactMultiplier}x)`);
    }
  }

  // 3. Adjusted Prediction
  const predictedCount = Math.max(1, Math.round(historicalMean * calendarMultiplier));

  // 4. Confidence Interval (90% CI ≈ 1.645 * stddev)
  const zScore = 1.645;
  const marginOfError = Math.round(zScore * Math.max(historicalStdDev, 5) * calendarMultiplier);
  const lowerBound = Math.max(1, predictedCount - marginOfError);
  const upperBound = predictedCount + marginOfError;

  // 5. Recommended Preparation Quantity (Predicted + 8% Buffer)
  const recommendedPortions = Math.round(
    predictedCount * (1 + DEFAULT_BUFFER_PERCENTAGE / 100),
  );

  const explanation = `${methodologyNote} ${
    eventNotes.length > 0 ? `Adjusted by calendar factor: ${eventNotes.join(', ')}.` : 'Standard academic schedule.'
  } Includes ${DEFAULT_BUFFER_PERCENTAGE}% kitchen safety preparation buffer.`;

  // 6. Check existing forecast / override
  const existing = await ForecastModel.findOne({
    institutionId: session.institutionId,
    messHallId,
    targetDate,
    mealType,
  });

  let overridden = false;
  let overrideCount: number | undefined;
  let overrideReason: string | undefined;

  if (existing?.overridden) {
    overridden = true;
    overrideCount = existing.overrideCount;
    overrideReason = existing.overrideReason;
  }

  // Upsert forecast record
  const savedDoc = await ForecastModel.findOneAndUpdate(
    {
      institutionId: session.institutionId,
      messHallId,
      targetDate,
      mealType,
    },
    {
      $set: {
        predictedCount,
        lowerBound,
        upperBound,
        confidenceLevel: 0.90,
        recommendedPortions: overridden && overrideCount ? overrideCount : recommendedPortions,
        bufferPercentage: DEFAULT_BUFFER_PERCENTAGE,
        modelVersion: 'baseline_v1_dow',
        dataPointsCount,
        historicalMean,
        historicalStdDev,
        calendarMultiplier,
        explanation,
      },
      $setOnInsert: {
        overridden: false,
        isSynthetic: false,
      },
    },
    { upsert: true, new: true },
  );

  return {
    targetDate,
    mealType,
    messHallId,
    predictedCount,
    lowerBound,
    upperBound,
    confidenceLevel: 0.90,
    recommendedPortions: overridden && overrideCount ? overrideCount : recommendedPortions,
    bufferPercentage: DEFAULT_BUFFER_PERCENTAGE,
    dataPointsCount,
    historicalMean,
    historicalStdDev,
    calendarMultiplier,
    explanation,
    overridden,
    overrideCount,
    overrideReason,
    forecastId: savedDoc._id.toString(),
  };
}

export async function generateDailyMealDemandForecast(
  session: Session,
  query: DailyForecastQuery,
): Promise<{
  targetDate: string;
  messHallId: string;
  dayOfWeek: number;
  dayName: string;
  meals: {
    breakfast: SingleMealForecastResult;
    lunch: SingleMealForecastResult;
    snacks: SingleMealForecastResult;
    dinner: SingleMealForecastResult;
  };
  totalPredictedDayCount: number;
  totalRecommendedPortions: number;
}> {
  const { targetDate, messHallId } = query;
  const targetDateObj = new Date(`${targetDate}T12:00:00Z`);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const [breakfast, lunch, snacks, dinner] = await Promise.all([
    generateSingleMealForecast(session, messHallId, targetDate, 'breakfast'),
    generateSingleMealForecast(session, messHallId, targetDate, 'lunch'),
    generateSingleMealForecast(session, messHallId, targetDate, 'snacks'),
    generateSingleMealForecast(session, messHallId, targetDate, 'dinner'),
  ]);

  const totalPredictedDayCount =
    breakfast.predictedCount + lunch.predictedCount + snacks.predictedCount + dinner.predictedCount;

  const totalRecommendedPortions =
    breakfast.recommendedPortions +
    lunch.recommendedPortions +
    snacks.recommendedPortions +
    dinner.recommendedPortions;

  return {
    targetDate,
    messHallId,
    dayOfWeek: targetDateObj.getUTCDay(),
    dayName: dayNames[targetDateObj.getUTCDay()],
    meals: { breakfast, lunch, snacks, dinner },
    totalPredictedDayCount,
    totalRecommendedPortions,
  };
}

export interface ForecastedIngredientItem {
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

export async function forecastIngredientRequirements(
  session: Session,
  query: IngredientForecastQuery,
): Promise<{
  targetDate: string;
  messHallId: string;
  mealType: MealType;
  forecast: SingleMealForecastResult;
  menuName?: string;
  ingredients: ForecastedIngredientItem[];
  totalProcurementCostPaise: number;
}> {
  await connectDb();
  const { targetDate, messHallId, mealType } = query;

  // 1. Get forecasted portions for this meal
  const forecast = await generateSingleMealForecast(session, messHallId, targetDate, mealType);
  const targetPortions = forecast.recommendedPortions;

  // 2. Fetch the active menu for target date
  const menu = await getMenuByDate(session, targetDate, messHallId);

  const mealsRecord = (menu?.meals || {}) as Record<string, unknown>;
  const mealDishes = mealsRecord[mealType] as
    | Array<{ dishId: { _id?: Types.ObjectId; name?: string } | Types.ObjectId; portionGrams: number }>
    | undefined;

  const ingredientMap = new Map<string, {
    name: string;
    category: string;
    unit: string;
    grossRequiredQty: number;
    currentStock: number;
    costPerUnitPaise: number;
    dishes: Set<string>;
  }>();

  if (mealDishes && mealDishes.length > 0) {
    for (const item of mealDishes) {
      const dishIdObj = typeof item.dishId === 'object' && item.dishId !== null ? item.dishId._id || item.dishId : item.dishId;
      const dishName = (typeof item.dishId === 'object' && item.dishId !== null && 'name' in item.dishId ? (item.dishId as { name: string }).name : '') || 'Dish';

      if (!dishIdObj) continue;

      // Find recipe for dish
      const recipe = await RecipeModel.findOne({
        institutionId: session.institutionId,
        dishId: dishIdObj,
      }).lean();

      if (recipe && recipe.ingredients) {
        const scale = targetPortions / (recipe.yieldPortions || 100);

        for (const ingItem of recipe.ingredients) {
          const ingIdStr = ingItem.ingredientId.toString();
          const ingDoc = await IngredientModel.findById(ingItem.ingredientId).lean<IngredientDoc>();

          if (!ingDoc) continue;

          const netQty = ingItem.quantity * scale;
          const wasteFactor = ingItem.wastePercentage > 0 ? 1 - ingItem.wastePercentage / 100 : 1;
          const grossQty = netQty / wasteFactor;

          const existing = ingredientMap.get(ingIdStr) || {
            name: ingDoc.name,
            category: ingDoc.category,
            unit: ingItem.unit,
            grossRequiredQty: 0,
            currentStock: ingDoc.currentStock || 0,
            costPerUnitPaise: ingDoc.costPerUnitPaise || 0,
            dishes: new Set<string>(),
          };

          existing.grossRequiredQty += grossQty;
          existing.dishes.add(dishName);
          ingredientMap.set(ingIdStr, existing);
        }
      }
    }
  }

  // Format response
  const ingredients: ForecastedIngredientItem[] = [];
  let totalProcurementCostPaise = 0;

  for (const [id, data] of ingredientMap.entries()) {
    const grossRequiredQty = Number(data.grossRequiredQty.toFixed(2));
    const shortfall = Number(Math.max(0, grossRequiredQty - data.currentStock).toFixed(2));
    const estimatedCostPaise = Math.round(grossRequiredQty * data.costPerUnitPaise);

    totalProcurementCostPaise += estimatedCostPaise;

    ingredients.push({
      ingredientId: id,
      name: data.name,
      category: data.category,
      unit: data.unit,
      grossRequiredQty,
      currentStock: data.currentStock,
      shortfall,
      estimatedCostPaise,
      associatedDishes: Array.from(data.dishes),
    });
  }

  return {
    targetDate,
    messHallId,
    mealType,
    forecast,
    menuName: (menu?.name as string) || 'Standard University Cycle',
    ingredients,
    totalProcurementCostPaise,
  };
}

export interface HistoricalComparisonItem {
  date: string;
  mealType: string;
  predicted: number;
  actual: number;
  lowerBound: number;
  upperBound: number;
  absoluteError: number;
  percentageError: number;
  withinConfidenceRange: boolean;
}

export async function getForecastVsActualHistory(
  session: Session,
  query: ForecastHistoryQuery,
): Promise<{
  history: HistoricalComparisonItem[];
  meanAbsolutePercentageError: number;
  accuracyRatePercentage: number;
}> {
  await connectDb();

  const filter: Record<string, unknown> = {
    institutionId: session.institutionId,
    messHallId: query.messHallId,
  };
  if (query.mealType) filter.mealType = query.mealType;
  if (query.startDate && query.endDate) {
    filter.targetDate = { $gte: query.startDate, $lte: query.endDate };
  }

  const forecasts = await ForecastModel.find(filter)
    .sort({ targetDate: -1 })
    .limit(query.limit)
    .lean<ForecastDoc[]>();

  const history: HistoricalComparisonItem[] = [];
  let totalApe = 0;
  let withinBoundsCount = 0;

  for (const f of forecasts) {
    // Find matching actual consumption
    const actual = await MealConsumptionModel.findOne({
      institutionId: session.institutionId,
      messHallId: f.messHallId,
      serviceDate: f.targetDate,
      mealType: f.mealType,
    }).lean();

    const actualCount = actual ? actual.totalSwipes || actual.headcountEstimate || 0 : 0;
    if (actualCount === 0) continue; // skip unrecorded days

    const absoluteError = Math.abs(f.predictedCount - actualCount);
    const percentageError = Number(((absoluteError / actualCount) * 100).toFixed(1));
    const withinConfidenceRange = actualCount >= f.lowerBound && actualCount <= f.upperBound;

    if (withinConfidenceRange) withinBoundsCount++;
    totalApe += percentageError;

    history.push({
      date: f.targetDate,
      mealType: f.mealType,
      predicted: f.predictedCount,
      actual: actualCount,
      lowerBound: f.lowerBound,
      upperBound: f.upperBound,
      absoluteError,
      percentageError,
      withinConfidenceRange,
    });
  }

  const meanAbsolutePercentageError =
    history.length > 0 ? Number((totalApe / history.length).toFixed(1)) : 0;

  const accuracyRatePercentage =
    history.length > 0 ? Math.round((withinBoundsCount / history.length) * 100) : 100;

  return {
    history,
    meanAbsolutePercentageError,
    accuracyRatePercentage,
  };
}

export async function overrideForecast(
  session: Session,
  input: OverrideForecastInput,
  ip?: string,
): Promise<ForecastDoc> {
  await connectDb();

  const forecast = await ForecastModel.findOne({
    institutionId: session.institutionId,
    _id: input.forecastId,
  });

  if (!forecast) {
    throw new NotFoundError('Forecast record not found');
  }

  const prevPortions = forecast.recommendedPortions;

  forecast.overridden = true;
  forecast.overrideCount = input.overrideCount;
  forecast.overrideReason = input.reason;
  forecast.overriddenBy = session.userId;
  forecast.recommendedPortions = input.overrideCount;
  await forecast.save();

  await writeAudit({
    session,
    ip,
    action: 'forecast.override',
    target: { type: 'Forecast', id: String(forecast._id) },
    before: { recommendedPortions: prevPortions },
    after: { recommendedPortions: input.overrideCount, reason: input.reason },
  });

  return forecast as unknown as ForecastDoc;
}
