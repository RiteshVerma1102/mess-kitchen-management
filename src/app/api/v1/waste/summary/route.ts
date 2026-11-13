import { protectedRoute } from '@/lib/http';
import { getWasteSummary } from '@/modules/waste/waste.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('waste:read', async ({ req, session }) => {
  const startDate = req.nextUrl.searchParams.get('startDate') || undefined;
  const endDate = req.nextUrl.searchParams.get('endDate') || undefined;
  const messHallId = req.nextUrl.searchParams.get('messHallId') || undefined;

  const summary = await getWasteSummary(session, startDate, endDate, messHallId);
  return summary;
});
