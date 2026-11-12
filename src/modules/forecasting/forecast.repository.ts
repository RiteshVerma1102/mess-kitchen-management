import { tenantRepo } from '@/core/tenant/repository';
import { ForecastModel, type IForecast } from './forecast.model';

export const forecastRepository = (institutionId: string) =>
  tenantRepo<IForecast>(ForecastModel, institutionId);
