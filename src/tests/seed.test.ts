import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seedDemoData } from '@/scripts/seed';
import { InstitutionModel } from '@/core/tenant/institution.model';
import { StudentModel } from '@/modules/students/student.model';
import { SupplierModel } from '@/modules/menus/supplier.model';
import { IngredientModel } from '@/modules/menus/ingredient.model';
import { DishModel } from '@/modules/menus/dish.model';
import { RecipeModel } from '@/modules/menus/recipe.model';
import { MenuModel } from '@/modules/menus/menu.model';
import { AttendanceModel } from '@/modules/attendance/attendance.model';
import { MealConsumptionModel } from '@/modules/attendance/consumption.model';
import { PreparationPlanModel } from '@/modules/planning/plan.model';
import { ServiceActualModel } from '@/modules/actuals/actual.model';
import { FoodWasteModel } from '@/modules/waste/waste.model';
import * as db from '@/lib/db';

describe('Seed Data Generator - Idempotency & Synthetic Tagging', () => {
  beforeEach(() => {
    vi.spyOn(db, 'connectDb').mockResolvedValue({} as never);
  });

  it('executes upsert operations for all core entities with isSynthetic flag', async () => {
    const mockFindOneAndUpdate = vi.fn().mockImplementation((filter, update) => {
      const doc = { _id: 'mock_id_123', ...(update?.$set ?? {}) };
      return Promise.resolve(doc);
    });

    vi.spyOn(InstitutionModel, 'findOneAndUpdate').mockImplementation(mockFindOneAndUpdate);
    vi.spyOn(SupplierModel, 'findOneAndUpdate').mockImplementation(mockFindOneAndUpdate);
    vi.spyOn(IngredientModel, 'findOneAndUpdate').mockImplementation(mockFindOneAndUpdate);
    vi.spyOn(DishModel, 'findOneAndUpdate').mockImplementation(mockFindOneAndUpdate);
    vi.spyOn(RecipeModel, 'findOneAndUpdate').mockImplementation(mockFindOneAndUpdate);
    vi.spyOn(MenuModel, 'findOneAndUpdate').mockImplementation(mockFindOneAndUpdate);
    vi.spyOn(StudentModel, 'findOneAndUpdate').mockImplementation(mockFindOneAndUpdate);
    vi.spyOn(AttendanceModel, 'findOneAndUpdate').mockImplementation(mockFindOneAndUpdate);
    vi.spyOn(MealConsumptionModel, 'findOneAndUpdate').mockImplementation(mockFindOneAndUpdate);
    vi.spyOn(PreparationPlanModel, 'findOneAndUpdate').mockImplementation(mockFindOneAndUpdate);
    vi.spyOn(ServiceActualModel, 'findOneAndUpdate').mockImplementation(mockFindOneAndUpdate);
    vi.spyOn(FoodWasteModel, 'findOneAndUpdate').mockImplementation(mockFindOneAndUpdate);

    // Mock countDocuments
    vi.spyOn(StudentModel, 'countDocuments').mockResolvedValue(30 as never);
    vi.spyOn(SupplierModel, 'countDocuments').mockResolvedValue(3 as never);
    vi.spyOn(IngredientModel, 'countDocuments').mockResolvedValue(16 as never);
    vi.spyOn(DishModel, 'countDocuments').mockResolvedValue(8 as never);
    vi.spyOn(RecipeModel, 'countDocuments').mockResolvedValue(3 as never);
    vi.spyOn(MenuModel, 'countDocuments').mockResolvedValue(7 as never);
    vi.spyOn(AttendanceModel, 'countDocuments').mockResolvedValue(1260 as never);
    vi.spyOn(MealConsumptionModel, 'countDocuments').mockResolvedValue(126 as never);
    vi.spyOn(PreparationPlanModel, 'countDocuments').mockResolvedValue(126 as never);
    vi.spyOn(ServiceActualModel, 'countDocuments').mockResolvedValue(126 as never);
    vi.spyOn(FoodWasteModel, 'countDocuments').mockResolvedValue(126 as never);

    const result = await seedDemoData('test_inst_id');

    expect(result.institutionId).toBe('test_inst_id');
    expect(result.counts.students).toBe(30);
    expect(result.counts.ingredients).toBe(16);
    expect(result.counts.menus).toBe(7);

    // Verify all upsert options specify upsert: true (idempotent guarantee)
    const instCalls = vi.mocked(InstitutionModel.findOneAndUpdate).mock.calls;
    expect(instCalls[0][2]).toMatchObject({ upsert: true });

    const studentCalls = vi.mocked(StudentModel.findOneAndUpdate).mock.calls;
    expect(studentCalls[0][2]).toMatchObject({ upsert: true });
    expect(studentCalls[0][1]).toMatchObject({ $set: expect.objectContaining({ isSynthetic: true }) });

    const wasteCalls = vi.mocked(FoodWasteModel.findOneAndUpdate).mock.calls;
    expect(wasteCalls[0][2]).toMatchObject({ upsert: true });
    expect(wasteCalls[0][1]).toMatchObject({ $set: expect.objectContaining({ isSynthetic: true }) });
  });
});
