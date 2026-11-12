import { protectedRoute, parse } from '@/lib/http';
import { adjustStock } from '@/modules/planning/inventory.service';
import { stockAdjustmentSchema } from '@/modules/planning/plan.schema';

export const dynamic = 'force-dynamic';

export const POST = protectedRoute('ingredient:write', async ({ req, session }) => {
  const body = await req.json();
  const input = parse(stockAdjustmentSchema, body);
  const result = await adjustStock(session, input);
  return result;
});
