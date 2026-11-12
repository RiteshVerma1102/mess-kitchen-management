import { tenantRepo } from '@/core/tenant/repository';
import { IndentModel, type IIndent } from './indent.model';

export const indentRepository = (institutionId: string) =>
  tenantRepo<IIndent>(IndentModel, institutionId);
