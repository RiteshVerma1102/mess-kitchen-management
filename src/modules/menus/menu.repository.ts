import { tenantRepo } from '@/core/tenant/repository';
import { MenuModel, type IMenu } from './menu.model';

export const menuRepository = (institutionId: string) =>
  tenantRepo<IMenu>(MenuModel, institutionId);
