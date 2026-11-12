import { tenantRepo } from '@/core/tenant/repository';
import { StudentModel, type IStudent } from './student.model';

export const studentRepository = (institutionId: string) => tenantRepo<IStudent>(StudentModel, institutionId);
