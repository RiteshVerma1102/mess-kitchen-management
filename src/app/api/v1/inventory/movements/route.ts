import { protectedRoute } from '@/lib/http';
import { getStockMovements } from '@/modules/planning/inventory.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('plan:read', async ({ req, session }) => {
  const ingredientId = req.nextUrl.searchParams.get('ingredientId') || undefined;
  const limit = req.nextUrl.searchParams.get('limit')
    ? parseInt(req.nextUrl.searchParams.get('limit')!, 10)
    : 50;

  const movements = await getStockMovements(session, ingredientId, limit);
  return { movements };
});
