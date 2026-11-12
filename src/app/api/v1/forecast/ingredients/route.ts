import { protectedRoute, parse } from '@/lib/http';
import { ingredientForecastQuery } from '@/modules/forecasting/forecast.schema';
import { forecastIngredientRequirements } from '@/modules/forecasting/forecast.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('forecast:read', async ({ req, session }) => {
  const query = parse(ingredientForecastQuery, Object.fromEntries(req.nextUrl.searchParams));
  return forecastIngredientRequirements(session, query);
});
