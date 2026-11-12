import { tenantRepo } from '@/core/tenant/repository';
import { DishModel } from './dish.model';

// The only place the Dish model is touched. Bound to the caller's institution.
export const dishRepository = (institutionId: string) => tenantRepo(DishModel, institutionId);
