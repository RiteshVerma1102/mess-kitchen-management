import { protectedRoute } from '@/lib/http';
import { getKitchenVarianceSummary } from '@/modules/actuals/actual.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('actual:read', async ({ req, session }) => {
  const serviceDate = req.nextUrl.searchParams.get('serviceDate') || new Date().toISOString().slice(0, 10);
  const messHallId = req.nextUrl.searchParams.get('messHallId') || 'hall_a';

  const summary = await getKitchenVarianceSummary(session, messHallId, serviceDate);
  return summary;
});
