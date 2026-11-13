import { protectedRoute, parse } from '@/lib/http';
import { getComprehensiveAnalytics } from '@/modules/analysis/analysis.service';
import { analyticsQuerySchema } from '@/modules/analysis/analysis.schema';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('analytics:read', async ({ req, session }) => {
  const query = parse(analyticsQuerySchema, Object.fromEntries(req.nextUrl.searchParams));
  const analytics = await getComprehensiveAnalytics(session, query);
  return analytics;
});
