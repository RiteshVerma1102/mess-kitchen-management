import { tenantRepo } from '@/core/tenant/repository';
import { PreparationPlanModel, type IPreparationPlan } from './plan.model';

export const planRepository = (institutionId: string) =>
  tenantRepo<IPreparationPlan>(PreparationPlanModel, institutionId);
