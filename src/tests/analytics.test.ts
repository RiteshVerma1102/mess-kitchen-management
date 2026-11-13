import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import * as db from '@/lib/db';
import * as audit from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import { FoodWasteModel } from '@/modules/waste/waste.model';
import { PreparationPlanModel } from '@/modules/planning/plan.model';
import { IndentModel } from '@/modules/planning/indent.model';
import { ServiceActualModel } from '@/modules/actuals/actual.model';
import { ForecastModel } from '@/modules/forecasting/forecast.model';
import { MealConsumptionModel } from '@/modules/attendance/consumption.model';
import {
  recordFoodWaste,
  getFoodWasteList,
  getWasteSummary,
} from '@/modules/waste/waste.service';
import {
  getComprehensiveAnalytics,
  generateReportCSV,
} from '@/modules/analysis/analysis.service';

const managerSession: Session = {
  userId: 'mgr_01',
  institutionId: 'inst_analytics_test',
  role: 'mess_manager',
  hallIds: ['hall_a'],
};

describe('Food Waste, Cost Management & Analytics Module', () => {
  beforeEach(() => {
    vi.spyOn(db, 'connectDb').mockResolvedValue(undefined as unknown as typeof import('mongoose'));
    vi.spyOn(audit, 'writeAudit').mockResolvedValue(undefined);
  });

  it('records food waste with integer paise financial loss and valid category', async () => {
    const mockWasteDoc = {
      _id: new Types.ObjectId(),
      institutionId: 'inst_analytics_test',
      messHallId: 'hall_a',
      serviceDate: '2026-11-20',
      mealType: 'lunch',
      wasteType: 'unserved_leftover',
      quantityKg: 12.5,
      financialLossPaise: 43750, // ₹437.50
      reasonCode: 'over_preparation',
      disposalMethod: 'biogas',
      toObject: function () {
        return this;
      },
    };

    vi.spyOn(FoodWasteModel, 'create').mockResolvedValue(mockWasteDoc as any);

    const waste = await recordFoodWaste(managerSession, {
      messHallId: 'hall_a',
      serviceDate: '2026-11-20',
      mealType: 'lunch',
      wasteType: 'unserved_leftover',
      quantityKg: 12.5,
      financialLossPaise: 43750,
      reasonCode: 'over_preparation',
      disposalMethod: 'biogas',
      notes: 'Unexpected drop in attendance during midterms',
    });

    expect(waste.quantityKg).toBe(12.5);
    expect(waste.financialLossPaise).toBe(43750);
    expect(waste.wasteType).toBe('unserved_leftover');
  });

  it('calculates waste percentage and cost per meal safely without dividing by zero', async () => {
    vi.spyOn(IndentModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(PreparationPlanModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          serviceDate: '2026-11-20',
          mealType: 'lunch',
          plannedPortions: 300,
          totalEstimatedCostPaise: 1050000, // ₹10,500.00
          forecastedHeadcount: 280,
        },
      ]),
    } as any);

    vi.spyOn(ServiceActualModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          serviceDate: '2026-11-20',
          mealType: 'lunch',
          quantityPrepared: 300,
          quantityServed: 270,
          quantityLeftover: 25,
          quantitySpoiled: 5,
        },
      ]),
    } as any);

    vi.spyOn(FoodWasteModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          serviceDate: '2026-11-20',
          mealType: 'lunch',
          wasteType: 'unserved_leftover',
          quantityKg: 7.5,
          financialLossPaise: 26250,
          reasonCode: 'over_preparation',
        },
      ]),
    } as any);

    vi.spyOn(ForecastModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { targetDate: '2026-11-20', mealType: 'lunch', predictedCount: 280 },
      ]),
    } as any);

    vi.spyOn(MealConsumptionModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { serviceDate: '2026-11-20', mealType: 'lunch', headcountEstimate: 270 },
      ]),
    } as any);

    const analytics = await getComprehensiveAnalytics(managerSession, {
      startDate: '2026-11-20',
      endDate: '2026-11-20',
      messHallId: 'hall_a',
    });

    // 25 leftover + 5 spoiled out of 300 prepared = (30 / 300) * 100 = 10%
    expect(analytics.kpis.wastePercentage).toBe(10);
    expect(analytics.kpis.totalMealsServed).toBe(270);
    // Cost per meal: ₹10,500 / 270 = ₹38.88 -> 3889 paise
    expect(analytics.kpis.costPerMealPaise).toBe(3889);
    // Forecast error: |270 - 280| / 270 * 100 = 3.7% MAPE
    expect(analytics.kpis.overallMape).toBe(3.7);
    expect(analytics.kpis.overallMae).toBe(10);
  });

  it('safely handles zero actual consumption and avoids NaN or Infinity in MAPE', async () => {
    vi.spyOn(IndentModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(PreparationPlanModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(ServiceActualModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(FoodWasteModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any);

    vi.spyOn(ForecastModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { targetDate: '2026-11-21', mealType: 'breakfast', predictedCount: 200 },
      ]),
    } as any);

    // Actual consumption is 0 (e.g. mess closed or emergency holiday)
    vi.spyOn(MealConsumptionModel, 'find').mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { serviceDate: '2026-11-21', mealType: 'breakfast', headcountEstimate: 0 },
      ]),
    } as any);

    const analytics = await getComprehensiveAnalytics(managerSession, {
      startDate: '2026-11-21',
      endDate: '2026-11-21',
      messHallId: 'hall_a',
    });

    // Must not be NaN or Infinity
    expect(Number.isNaN(analytics.kpis.overallMape)).toBe(false);
    expect(Number.isFinite(analytics.kpis.overallMape)).toBe(true);
    expect(analytics.kpis.overallMape).toBe(0);
    expect(analytics.kpis.wastePercentage).toBe(0);
    expect(analytics.kpis.costPerMealPaise).toBe(0);
  });

  it('generates well-formed CSV report for export', async () => {
    vi.spyOn(FoodWasteModel, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          serviceDate: '2026-11-20',
          messHallId: 'hall_a',
          mealType: 'lunch',
          wasteType: 'unserved_leftover',
          quantityKg: 5.2,
          financialLossPaise: 18200,
          reasonCode: 'over_preparation',
          disposalMethod: 'biogas',
          notes: 'Standard service waste',
        },
      ]),
    } as any);

    const report = await generateReportCSV(managerSession, {
      type: 'waste_log',
      startDate: '2026-11-01',
      endDate: '2026-11-20',
      messHallId: 'hall_a',
    });

    expect(report.filename).toBe('waste_log_2026-11-01_to_2026-11-20.csv');
    expect(report.csvContent).toContain('Service Date,Mess Hall,Meal Type');
    expect(report.csvContent).toContain('2026-11-20,hall_a,lunch');
    expect(report.csvContent).toContain('182.00'); // ₹182.00
  });
});
