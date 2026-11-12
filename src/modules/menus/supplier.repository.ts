import { tenantRepo } from '@/core/tenant/repository';
import { SupplierModel, type ISupplier } from './supplier.model';

export const supplierRepository = (institutionId: string) =>
  tenantRepo<ISupplier>(SupplierModel, institutionId);
