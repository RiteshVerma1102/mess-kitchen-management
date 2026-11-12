import { protectedRoute, parse } from '@/lib/http';
import { forecastHistoryQuery } from '@/modules/forecasting/forecast.schema';
import { getForecastVsActualHistory } from '@/modules/forecasting/forecast.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('forecast:read', async ({ req, session }) => {
  const query = parse(forecastHistoryQuery, Object.fromEntries(req.nextUrl.searchParams));
  return getForecastVsActualHistory(session, query);
});
