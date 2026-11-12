import { tenantRepo } from '@/core/tenant/repository';
import { FoodWasteModel, type IFoodWaste } from './waste.model';

export const wasteRepository = (institutionId: string) =>
  tenantRepo<IFoodWaste>(FoodWasteModel, institutionId);
