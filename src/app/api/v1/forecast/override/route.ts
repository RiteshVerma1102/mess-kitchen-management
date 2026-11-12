import { protectedRoute, parse } from '@/lib/http';
import { overrideForecastSchema } from '@/modules/forecasting/forecast.schema';
import { overrideForecast } from '@/modules/forecasting/forecast.service';

export const dynamic = 'force-dynamic';

export const POST = protectedRoute('forecast:override', async ({ req, session, ip }) => {
  const body = parse(overrideForecastSchema, await req.json());
  return overrideForecast(session, body, ip);
});
