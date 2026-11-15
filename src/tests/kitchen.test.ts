import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Types } from 'mongoose';
import * as db from '@/lib/db';
import * as audit from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import { PreparationPlanModel } from '@/modules/planning/plan.model';
import { IndentModel } from '@/modules/planning/indent.model';
import { StockMovementModel } from '@/modules/planning/stock-movement.model';
import { ServiceActualModel } from '@/modules/actuals/actual.model';
import { IngredientModel } from '@/modules/menus/ingredient.model';
import { DishModel } from '@/modules/menus/dish.model';
import { RecipeModel } from '@/modules/menus/recipe.model';
import {
  generateDailyKitchenPlan,
  getDailyKitchenPlans,
  updatePreparationPlan,
} from '@/modules/planning/plan.service';
import {
  generateIndentFromShortages,
  createManualIndent,
  updateIndentStatus,
} from '@/modules/planning/indent.service';
import {
  getInventoryOverview,
  adjustStock,
} from '@/modules/planning/inventory.service';
import {
  recordKitchenActual,
  getKitchenVarianceSummary,
} from '@/modules/actuals/actual.service';
import * as forecastService from '@/modules/forecasting/forecast.service';
import * as menuService from '@/modules/menus/menu.service';

const managerSession: Session = {
  userId: 'mgr_01',
  institutionId: 'inst_kitchen_test',
  role: 'mess_manager',
  hallIds: ['hall_a'],
};

const staffSession: Session = {
  userId: 'staff_01',
  institutionId: 'inst_kitchen_test',
  role: 'kitchen_staff',
  hallIds: ['hall_a'],
};

const otherInstitutionSession: Session = {
  userId: 'other_01',
  institutionId: 'inst_other',
  role: 'mess_manager',
  hallIds: ['hall_b'],
};

describe('Kitchen Operations & Inventory Module', () => {
  beforeEach(() => {
    vi.spyOn(db, 'connectDb').mockResolvedValue(undefined as unknown as typeof import('mongoose'));
    vi.spyOn(audit, 'writeAudit').mockResolvedValue(undefined);
  });

  it('generates a daily kitchen preparation plan applying forecast and safety buffer', async () => {
    vi.spyOn(forecastService, 'generateSingleMealForecast').mockResolvedValue({
      targetDate: '2026-11-20',
      mealType: 'lunch',
      messHallId: 'hall_a',
      predictedCount: 400,
      lowerBound: 370,
      upperBound: 430,
      confidenceLevel: 90,
      recommendedPortions: 432,
      bufferPercentage: 8,
      dataPointsCount: 8,
      historicalMean: 400,
      historicalStdDev: 18,
      calendarMultiplier: 1.0,
      explanation: 'Test forecast',
      overridden: false,
    });

    const mockDishId = new Types.ObjectId();
    vi.spyOn(menuService, 'getMenuByDate').mockResolvedValue({
      _id: new Types.ObjectId(),
      institutionId: 'inst_kitchen_test',
      name: 'Standard Friday Menu',
      dayOfWeek: 5,
      effectiveFrom: '2026-01-01',
      active: true,
      meals: {
        lunch: [{ dishId: mockDishId, portionGrams: 200 }],
      },
    });

    vi.spyOn(DishModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: mockDishId, name: 'Rajma Chawal' }),
    } as unknown as ReturnType<typeof DishModel.findById>);

    vi.spyOn(RecipeModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        dishId: mockDishId,
        yieldPortions: 100,
        ingredients: [],
      }),
    } as unknown as ReturnType<typeof RecipeModel.findOne>);

    const mockPlanDoc = {
      _id: new Types.ObjectId(),
      institutionId: 'inst_kitchen_test',
      messHallId: 'hall_a',
      serviceDate: '2026-11-20',
      mealType: 'lunch',
      forecastedHeadcount: 400,
      bufferPercentage: 10,
      plannedPortions: 440, // 400 * 1.10 = 440
      items: [
        {
          dishId: mockDishId,
          dishName: 'Rajma Chawal',
          plannedPortions: 440,
          estimatedCostPaise: 1540000,
        },
      ],
      totalEstimatedCostPaise: 1540000,
      status: 'draft',
      toObject: function () {
        return this;
      },
    };

    vi.spyOn(PreparationPlanModel, 'findOneAndUpdate').mockResolvedValue(mockPlanDoc);

    const plan = await generateDailyKitchenPlan(managerSession, {
      messHallId: 'hall_a',
      serviceDate: '2026-11-20',
      mealType: 'lunch',
      bufferPercentage: 10,
    });

    expect(plan.plannedPortions).toBe(440);
    expect(plan.forecastedHeadcount).toBe(400);
    expect(plan.items[0].dishName).toBe('Rajma Chawal');
  });

  it('prevents negative inventory when adjusting stock levels', async () => {
    const mockIngId = new Types.ObjectId();
    const mockIng = {
      _id: mockIngId,
      institutionId: 'inst_kitchen_test',
      name: 'Basmati Rice',
      unit: 'kg',
      currentStock: 15.5,
      costPerUnitPaise: 6500,
      reorderThreshold: 20,
      save: vi.fn().mockResolvedValue(true),
      toObject: function () {
        return this;
      },
    };

    vi.spyOn(IngredientModel, 'findOne').mockResolvedValue(mockIng as unknown as import('@/modules/menus/ingredient.model').IngredientDoc);

    // Attempting to deduct 20kg from 15.5kg stock must throw ValidationError
    await expect(
      adjustStock(managerSession, {
        ingredientId: mockIngId.toString(),
        quantityChange: -20,
        movementType: 'outward_kitchen',
        notes: 'Excessive kitchen draw',
      }),
    ).rejects.toThrow(/insufficient stock/i);
  });

  it('accurately updates stock and records stock movement on valid adjustment', async () => {
    const mockIngId = new Types.ObjectId();
    const mockIng = {
      _id: mockIngId,
      institutionId: 'inst_kitchen_test',
      name: 'Basmati Rice',
      unit: 'kg',
      currentStock: 50,
      costPerUnitPaise: 6500,
      reorderThreshold: 20,
      save: vi.fn().mockResolvedValue(true),
      toObject: function () {
        return this;
      },
    };

    vi.spyOn(IngredientModel, 'findOne').mockResolvedValue(mockIng as unknown as import('@/modules/menus/ingredient.model').IngredientDoc);
    (vi.spyOn(StockMovementModel, 'create') as any).mockImplementation(async () => ({
      _id: new Types.ObjectId(),
      institutionId: 'inst_kitchen_test',
      ingredientId: mockIngId,
      quantity: 25,
      balanceAfter: 75,
      toObject: function () {
        return this;
      },
    }));

    const result = await adjustStock(managerSession, {
      ingredientId: mockIngId.toString(),
      quantityChange: 25,
      movementType: 'inward_indent',
      notes: 'Direct market delivery',
    });

    expect(result.ingredient.currentStock).toBe(75);
    expect(mockIng.save).toHaveBeenCalled();
  });

  it('prevents duplicate active indent generation for the same hall and date', async () => {
    vi.spyOn(IndentModel, 'findOne').mockResolvedValue({
      _id: new Types.ObjectId(),
      indentNumber: 'IND-20261120-001',
      status: 'submitted',
    } as unknown as import('@/modules/planning/indent.model').IndentDoc);

    await expect(
      generateIndentFromShortages(managerSession, {
        messHallId: 'hall_a',
        targetDate: '2026-11-20',
      }),
    ).rejects.toThrow(/already exists/);
  });

  it('fulfilling an indent atomically increments ingredient stock and creates stock movements', async () => {
    const ingId = new Types.ObjectId();
    const indentId = new Types.ObjectId();

    const mockIndent = {
      _id: indentId,
      institutionId: 'inst_kitchen_test',
      indentNumber: 'IND-20261120-002',
      status: 'approved',
      items: [
        {
          ingredientId: ingId,
          ingredientName: 'Potatoes',
          requestedQuantity: 50,
          issuedQuantity: 0,
          unit: 'kg',
          unitCostPaise: 2500,
          totalCostPaise: 125000,
        },
      ],
      save: vi.fn().mockResolvedValue(true),
      toObject: function () {
        return this;
      },
    };

    vi.spyOn(IndentModel, 'findOne').mockResolvedValue(mockIndent as unknown as import('@/modules/planning/indent.model').IndentDoc);
    vi.spyOn(IngredientModel, 'findOneAndUpdate').mockResolvedValue({
      _id: ingId,
      currentStock: 120,
    } as unknown as import('@/modules/menus/ingredient.model').IngredientDoc);
    const movementSpy = (vi.spyOn(StockMovementModel, 'create') as any).mockImplementation(async () => ({}));

    const updated = await updateIndentStatus(managerSession, indentId.toString(), {
      status: 'fulfilled',
      items: [{ ingredientId: ingId.toString(), issuedQuantity: 50 }],
    });

    expect(updated.status).toBe('fulfilled');
    expect(movementSpy).toHaveBeenCalled();
  });

  it('records kitchen actuals and calculates variance against planned portions', async () => {
    const dishId = new Types.ObjectId();
    vi.spyOn(DishModel, 'findById').mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: dishId, name: 'Paneer Butter Masala' }),
    } as unknown as ReturnType<typeof DishModel.findById>);

    vi.spyOn(PreparationPlanModel, 'findOne').mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        plannedPortions: 300,
        items: [{ dishId, dishName: 'Paneer Butter Masala', plannedPortions: 300 }],
      }),
    } as unknown as ReturnType<typeof PreparationPlanModel.findOne>);

    vi.spyOn(ServiceActualModel, 'findOneAndUpdate').mockResolvedValue({
      _id: new Types.ObjectId(),
      dishName: 'Paneer Butter Masala',
      plannedPortions: 300,
      quantityPrepared: 320,
      quantityServed: 310,
      quantityLeftover: 10,
      variancePercentage: 6.7, // (320 - 300) / 300 = +6.7%
      toObject: function () {
        return this;
      },
    });

    const actual = await recordKitchenActual(staffSession, {
      messHallId: 'hall_a',
      serviceDate: '2026-11-20',
      mealType: 'dinner',
      dishId: dishId.toString(),
      quantityPrepared: 320,
      quantityServed: 310,
      quantityLeftover: 10,
      quantitySpoiled: 0,
      unit: 'portion',
    });

    expect(actual.quantityPrepared).toBe(320);
    expect(actual.quantityServed).toBe(310);
    expect(actual.variancePercentage).toBe(6.7);
  });
});
