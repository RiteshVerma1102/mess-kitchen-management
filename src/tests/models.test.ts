import { describe, it, expect, vi } from 'vitest';
import { IngredientModel } from '@/modules/menus/ingredient.model';
import { PreparationPlanModel } from '@/modules/planning/plan.model';
import { FoodWasteModel } from '@/modules/waste/waste.model';
import { AttendanceModel } from '@/modules/attendance/attendance.model';
import { StudentModel } from '@/modules/students/student.model';
import { MenuModel } from '@/modules/menus/menu.model';
import { ServiceActualModel } from '@/modules/actuals/actual.model';
import { studentRepository } from '@/modules/students/student.repository';
import { ingredientRepository } from '@/modules/menus/ingredient.repository';
import { attendanceRepository } from '@/modules/attendance/attendance.repository';
import { planRepository } from '@/modules/planning/plan.repository';
import { actualRepository } from '@/modules/actuals/actual.repository';
import { wasteRepository } from '@/modules/waste/waste.repository';

describe('Data Layer Models - Schema Constraints and Types', () => {
  it('IngredientModel requires integer paise for costPerUnitPaise', () => {
    const valid = new IngredientModel({
      institutionId: 'inst_1',
      name: 'Toor Dal',
      category: 'pulse',
      unit: 'kg',
      costPerUnitPaise: 13500, // ₹135.00
      currentStock: 50,
      reorderThreshold: 10,
      shelfLifeDays: 90,
      storageType: 'dry',
    });
    const err = valid.validateSync();
    expect(err).toBeUndefined();

    const invalid = new IngredientModel({
      institutionId: 'inst_1',
      name: 'Toor Dal Float',
      category: 'pulse',
      unit: 'kg',
      costPerUnitPaise: 135.5, // Invalid float money!
      currentStock: 50,
      reorderThreshold: 10,
      shelfLifeDays: 90,
      storageType: 'dry',
    });
    const floatErr = invalid.validateSync();
    expect(floatErr?.errors['costPerUnitPaise']).toBeDefined();
  });

  it('FoodWasteModel validates reasonCode enum and financialLossPaise', () => {
    const validWaste = new FoodWasteModel({
      institutionId: 'inst_1',
      messHallId: 'hall_a',
      serviceDate: '2026-11-12',
      mealType: 'lunch',
      wasteType: 'unserved_leftover',
      quantityKg: 15.5,
      financialLossPaise: 38750, // ₹387.50
      reasonCode: 'over_preparation',
      recordedBy: 'cook_1',
    });
    expect(validWaste.validateSync()).toBeUndefined();

    const invalidReason = new FoodWasteModel({
      institutionId: 'inst_1',
      messHallId: 'hall_a',
      serviceDate: '2026-11-12',
      mealType: 'lunch',
      wasteType: 'unserved_leftover',
      quantityKg: 15.5,
      financialLossPaise: 38750,
      reasonCode: 'unknown_reason_code' as never,
      recordedBy: 'cook_1',
    });
    expect(invalidReason.validateSync()?.errors['reasonCode']).toBeDefined();
  });

  it('AttendanceModel requires clientUuid for idempotency and service coordinates', () => {
    const att = new AttendanceModel({
      institutionId: 'inst_1',
      clientUuid: 'uuid-1234-abcd',
      studentRef: '2024CS001',
      messHallId: 'hall_a',
      serviceDate: '2026-11-12',
      mealType: 'breakfast',
      method: 'qr',
      deviceId: 'tab_01',
    });
    expect(att.validateSync()).toBeUndefined();
    expect(att.isSynthetic).toBe(false);

    const missingUuid = new AttendanceModel({
      institutionId: 'inst_1',
      studentRef: '2024CS001',
      messHallId: 'hall_a',
      serviceDate: '2026-11-12',
      mealType: 'breakfast',
      method: 'qr',
      deviceId: 'tab_01',
    });
    expect(missingUuid.validateSync()?.errors['clientUuid']).toBeDefined();
  });

  it('PreparationPlanModel requires integer cost and positive headcount', () => {
    const plan = new PreparationPlanModel({
      institutionId: 'inst_1',
      messHallId: 'hall_a',
      serviceDate: '2026-11-12',
      mealType: 'dinner',
      forecastedHeadcount: 420,
      bufferPercentage: 5,
      plannedPortions: 441,
      totalEstimatedCostPaise: 1543500,
      status: 'approved',
    });
    expect(plan.validateSync()).toBeUndefined();
  });
});

describe('Data Layer Models - Compound Indexes', () => {
  it('registers correct compound indexes on schemas', () => {
    const studentIndexes = StudentModel.schema.indexes();
    const hasStudentIndex = studentIndexes.some(
      ([idx]) => idx.institutionId === 1 && idx.enrollmentNumber === 1,
    );
    expect(hasStudentIndex).toBe(true);

    const menuIndexes = MenuModel.schema.indexes();
    const hasMenuIndex = menuIndexes.some(
      ([idx]) => idx.institutionId === 1 && idx.name === 1 && idx.dayOfWeek === 1,
    );
    expect(hasMenuIndex).toBe(true);

    const planIndexes = PreparationPlanModel.schema.indexes();
    const hasPlanIndex = planIndexes.some(
      ([idx]) =>
        idx.institutionId === 1 &&
        idx.messHallId === 1 &&
        idx.serviceDate === 1 &&
        idx.mealType === 1,
    );
    expect(hasPlanIndex).toBe(true);

    const actualIndexes = ServiceActualModel.schema.indexes();
    const hasActualIndex = actualIndexes.some(
      ([idx]) =>
        idx.institutionId === 1 &&
        idx.messHallId === 1 &&
        idx.serviceDate === 1 &&
        idx.dishId === 1,
    );
    expect(hasActualIndex).toBe(true);

    const wasteIndexes = FoodWasteModel.schema.indexes();
    const hasWasteIndex = wasteIndexes.some(
      ([idx]) => idx.institutionId === 1 && idx.serviceDate === -1,
    );
    expect(hasWasteIndex).toBe(true);
  });
});

describe('Data Layer Repositories - Tenant Isolation', () => {
  const chain = {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
  };

  const createMockModel = () => ({
    find: vi.fn().mockReturnValue(chain),
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    findOneAndDelete: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({ toObject: () => ({}) }),
  });

  it('enforces institutionId filter across student, ingredient, attendance, plan, and waste repos', async () => {
    const sRepo = studentRepository('tenant_alpha');
    const mockModel = createMockModel();
    vi.spyOn(StudentModel, 'find').mockImplementation(mockModel.find as never);
    await sRepo.list();
    expect(StudentModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ institutionId: 'tenant_alpha' }),
    );

    const ingRepo = ingredientRepository('tenant_beta');
    vi.spyOn(IngredientModel, 'find').mockImplementation(mockModel.find as never);
    await ingRepo.list();
    expect(IngredientModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ institutionId: 'tenant_beta' }),
    );

    const attRepo = attendanceRepository('tenant_gamma');
    vi.spyOn(AttendanceModel, 'find').mockImplementation(mockModel.find as never);
    await attRepo.list({ mealType: 'lunch' });
    expect(AttendanceModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ institutionId: 'tenant_gamma', mealType: 'lunch' }),
    );

    const pRepo = planRepository('tenant_delta');
    vi.spyOn(PreparationPlanModel, 'find').mockImplementation(mockModel.find as never);
    await pRepo.list();
    expect(PreparationPlanModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ institutionId: 'tenant_delta' }),
    );

    const aRepo = actualRepository('tenant_epsilon');
    vi.spyOn(ServiceActualModel, 'find').mockImplementation(mockModel.find as never);
    await aRepo.list();
    expect(ServiceActualModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ institutionId: 'tenant_epsilon' }),
    );

    const wRepo = wasteRepository('tenant_zeta');
    vi.spyOn(FoodWasteModel, 'find').mockImplementation(mockModel.find as never);
    await wRepo.list();
    expect(FoodWasteModel.find).toHaveBeenCalledWith(
      expect.objectContaining({ institutionId: 'tenant_zeta' }),
    );
  });
});
