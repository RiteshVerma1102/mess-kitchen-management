import { protectedRoute } from '@/lib/http';
import { getInventoryOverview } from '@/modules/planning/inventory.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('plan:read', async ({ req, session }) => {
  const category = req.nextUrl.searchParams.get('category') || undefined;
  const status = req.nextUrl.searchParams.get('status') || undefined;
  const search = req.nextUrl.searchParams.get('search') || undefined;

  const data = await getInventoryOverview(session, { category, status, search });
  return data;
});
