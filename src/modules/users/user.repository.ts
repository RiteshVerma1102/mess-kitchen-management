import { tenantRepo } from '@/core/tenant/repository';
import { UserModel, type IUser } from './user.model';

export const userRepository = (institutionId: string) =>
  tenantRepo<IUser>(UserModel, institutionId);
