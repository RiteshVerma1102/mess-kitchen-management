import { tenantRepo } from '@/core/tenant/repository';
import { ServiceActualModel, type IServiceActual } from './actual.model';

export const actualRepository = (institutionId: string) =>
  tenantRepo<IServiceActual>(ServiceActualModel, institutionId);
