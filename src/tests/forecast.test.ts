import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signAccessToken } from '@/core/auth/jwt';
import { MealConsumptionModel } from '@/modules/attendance/consumption.model';
import { CalendarEventModel } from '@/modules/calendar/calendar.model';
import { ForecastModel } from '@/modules/forecasting/forecast.model';
import { StudentModel } from '@/modules/students/student.model';
import { RecipeModel } from '@/modules/menus/recipe.model';
import { IngredientModel } from '@/modules/menus/ingredient.model';
import * as db from '@/lib/db';
import * as rateLimit from '@/lib/rate-limit';
import * as audit from '@/core/audit/audit.service';
import * as menuService from '@/modules/menus/menu.service';
import {
  generateSingleMealForecast,
  generateDailyMealDemandForecast,
  forecastIngredientRequirements,
  getForecastVsActualHistory,
} from '@/modules/forecasting/forecast.service';
import { GET as getDailyForecastRoute } from '@/app/api/v1/forecast/daily/route';
import { POST as overrideForecastRoute } from '@/app/api/v1/forecast/override/route';

describe('Baseline Food Demand Forecasting Engine (M5)', () => {
  beforeAll(() => {
    process.env.MONGODB_URI ??= 'mongodb://localhost:27017/test';
    process.env.REDIS_URL ??= 'redis://localhost:6379';
    process.env.JWT_ACCESS_SECRET ??= 'a'.repeat(32);
    process.env.JWT_REFRESH_SECRET ??= 'b'.repeat(32);
  });

  beforeEach(() => {
    vi.spyOn(db, 'connectDb').mockResolvedValue({} as never);
    vi.spyOn(rateLimit, 'enforceRateLimit').mockResolvedValue(undefined);
    vi.spyOn(audit, 'writeAudit').mockResolvedValue(undefined);
  });

  const session = {
    userId: 'u_manager',
    institutionId: 'inst_1',
    role: 'mess_manager' as const,
    hallIds: ['hall_a'],
  };

  it('calculates statistical baseline accurately with multiple same-weekday historical records', async () => {
    // Target date: 2026-11-20 is a Friday (dayOfWeek = 5)
    // Past Fridays: 2026-11-13 (400), 2026-11-06 (420), 2026-10-30 (380) -> mean = 400
    vi.spyOn(MealConsumptionModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { serviceDate: '2026-11-13', totalSwipes: 400 },
        { serviceDate: '2026-11-06', totalSwipes: 420 },
        { serviceDate: '2026-10-30', totalSwipes: 380 },
      ]),
    } as never);

    vi.spyOn(CalendarEventModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as never);

    vi.spyOn(ForecastModel, 'findOne').mockResolvedValue(null as never);
    vi.spyOn(ForecastModel, 'findOneAndUpdate').mockResolvedValue({
      _id: 'forecast_123',
    } as never);

    const result = await generateSingleMealForecast(session, 'hall_a', '2026-11-20', 'lunch');

    expect(result.dataPointsCount).toBe(3);
    expect(result.historicalMean).toBe(400);
    expect(result.predictedCount).toBe(400);
    // Lower bound < predicted < upper bound
    expect(result.lowerBound).toBeLessThanOrEqual(result.predictedCount);
    expect(result.upperBound).toBeGreaterThanOrEqual(result.predictedCount);
    // Recommended portions = 400 * 1.08 = 432
    expect(result.recommendedPortions).toBe(432);
    expect(result.bufferPercentage).toBe(8);
  });

  it('handles missing historical data gracefully by falling back to active enrollment population', async () => {
    // No historical records in database
    vi.spyOn(MealConsumptionModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as never);

    vi.spyOn(StudentModel, 'countDocuments').mockResolvedValue(500 as never);
    vi.spyOn(CalendarEventModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as never);

    vi.spyOn(ForecastModel, 'findOne').mockResolvedValue(null as never);
    vi.spyOn(ForecastModel, 'findOneAndUpdate').mockResolvedValue({
      _id: 'forecast_fallback',
    } as never);

    // Lunch turnout benchmark = 88% of 500 = 440
    const result = await generateSingleMealForecast(session, 'hall_a', '2026-11-20', 'lunch');

    expect(result.dataPointsCount).toBe(0);
    expect(result.predictedCount).toBe(440);
    expect(result.recommendedPortions).toBe(Math.round(440 * 1.08));
    expect(result.explanation).toContain('no historical records yet');
  });

  it('applies calendar impact multipliers correctly (e.g. 0.25 on university holiday)', async () => {
    vi.spyOn(MealConsumptionModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { serviceDate: '2026-11-13', totalSwipes: 400 },
        { serviceDate: '2026-11-06', totalSwipes: 400 },
      ]),
    } as never);

    // Holiday on 2026-11-20 with 0.25 multiplier
    vi.spyOn(CalendarEventModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          title: 'Guru Nanak Jayanti',
          eventType: 'holiday',
          impactMultiplier: 0.25,
          affectedMeals: ['breakfast', 'lunch', 'dinner'],
        },
      ]),
    } as never);

    vi.spyOn(ForecastModel, 'findOne').mockResolvedValue(null as never);
    vi.spyOn(ForecastModel, 'findOneAndUpdate').mockResolvedValue({
      _id: 'forecast_holiday',
    } as never);

    const result = await generateSingleMealForecast(session, 'hall_a', '2026-11-20', 'lunch');

    expect(result.historicalMean).toBe(400);
    expect(result.calendarMultiplier).toBe(0.25);
    // Predicted count = 400 * 0.25 = 100
    expect(result.predictedCount).toBe(100);
    // Prep = 100 * 1.08 = 108
    expect(result.recommendedPortions).toBe(108);
  });

  it('forecasts raw ingredient commodity requirements by scaling BOM with kitchen buffer', async () => {
    vi.spyOn(MealConsumptionModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { serviceDate: '2026-11-13', totalSwipes: 200 },
        { serviceDate: '2026-11-06', totalSwipes: 200 },
      ]),
    } as never);

    vi.spyOn(CalendarEventModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as never);

    vi.spyOn(ForecastModel, 'findOne').mockResolvedValue(null as never);
    vi.spyOn(ForecastModel, 'findOneAndUpdate').mockResolvedValue({
      _id: 'forecast_ing',
    } as never);

    // Mock active menu
    vi.spyOn(menuService, 'getMenuByDate').mockResolvedValue({
      name: 'Friday Lunch Rotation',
      meals: {
        lunch: [
          {
            dishId: { _id: '507f1f77bcf86cd799439011', name: 'Rajma Masala' },
            portionGrams: 250,
          },
        ],
      },
    } as never);

    // Mock Recipe BOM (yield 100 portions, 10 kg red rajma)
    vi.spyOn(RecipeModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        yieldPortions: 100,
        ingredients: [
          {
            ingredientId: '507f1f77bcf86cd799439022',
            quantity: 10,
            unit: 'kg',
            wastePercentage: 0,
          },
        ],
      }),
    } as never);

    // Mock Ingredient doc (stock 5 kg, ₹110.00/kg)
    vi.spyOn(IngredientModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439022',
        name: 'Red Kidney Beans (Rajma)',
        category: 'pulse',
        costPerUnitPaise: 11000,
        currentStock: 5,
      }),
    } as never);

    // Forecast: 200 predicted -> recommended = 216 portions
    // Scale factor = 216 / 100 = 2.16
    // Rajma needed = 10 kg * 2.16 = 21.6 kg
    // Shortfall = 21.6 - 5 (stock) = 16.6 kg
    const ingResult = await forecastIngredientRequirements(session, {
      targetDate: '2026-11-20',
      messHallId: 'hall_a',
      mealType: 'lunch',
    });

    expect(ingResult.ingredients.length).toBe(1);
    const rajma = ingResult.ingredients[0];
    expect(rajma.grossRequiredQty).toBe(21.6);
    expect(rajma.shortfall).toBe(16.6);
    expect(rajma.estimatedCostPaise).toBe(Math.round(21.6 * 11000));
  });

  it('computes historical prediction accuracy and MAPE error metrics', async () => {
    vi.spyOn(ForecastModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          messHallId: 'hall_a',
          targetDate: '2026-11-10',
          mealType: 'lunch',
          predictedCount: 300,
          lowerBound: 270,
          upperBound: 330,
        },
      ]),
    } as never);

    // Actual was 310
    vi.spyOn(MealConsumptionModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        totalSwipes: 310,
      }),
    } as never);

    const history = await getForecastVsActualHistory(session, {
      messHallId: 'hall_a',
      limit: 10,
    });

    expect(history.history.length).toBe(1);
    expect(history.history[0].absoluteError).toBe(10);
    // |300 - 310| / 310 ≈ 3.2%
    expect(history.meanAbsolutePercentageError).toBe(3.2);
    expect(history.accuracyRatePercentage).toBe(100);
  });

  it('POST /api/v1/forecast/override allows mess managers to adjust portions with audit reason', async () => {
    const managerToken = await signAccessToken({
      userId: 'u_manager',
      institutionId: 'inst_1',
      role: 'mess_manager',
      hallIds: [],
    });

    const mockForecast = {
      _id: '507f1f77bcf86cd799439011',
      recommendedPortions: 350,
      overridden: false,
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(ForecastModel, 'findOne').mockResolvedValue(mockForecast as never);

    const req = new NextRequest('http://localhost:3000/api/v1/forecast/override', {
      method: 'POST',
      headers: { authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({
        forecastId: '507f1f77bcf86cd799439011',
        overrideCount: 420,
        reason: 'Hostel committee requested feast additions for annual fest.',
      }),
    });

    const res = await overrideForecastRoute(req, { params: {} });
    expect(res.status).toBe(200);
    expect(mockForecast.recommendedPortions).toBe(420);
    expect(mockForecast.overridden).toBe(true);
  });
});
