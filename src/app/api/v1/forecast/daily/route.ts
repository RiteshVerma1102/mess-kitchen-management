import { protectedRoute, parse } from '@/lib/http';
import { dailyForecastQuery } from '@/modules/forecasting/forecast.schema';
import { generateDailyMealDemandForecast } from '@/modules/forecasting/forecast.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('forecast:read', async ({ req, session }) => {
  const query = parse(dailyForecastQuery, Object.fromEntries(req.nextUrl.searchParams));
  return generateDailyMealDemandForecast(session, query);
});
