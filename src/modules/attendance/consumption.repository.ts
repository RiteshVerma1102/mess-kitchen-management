import { tenantRepo } from '@/core/tenant/repository';
import { MealConsumptionModel, type IMealConsumption } from './consumption.model';

export const consumptionRepository = (institutionId: string) =>
  tenantRepo<IMealConsumption>(MealConsumptionModel, institutionId);
