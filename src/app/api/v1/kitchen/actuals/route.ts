import { protectedRoute, parse, created } from '@/lib/http';
import {
  recordKitchenActual,
  getKitchenActuals,
} from '@/modules/actuals/actual.service';
import {
  recordActualSchema,
  listActualsQuerySchema,
} from '@/modules/actuals/actual.schema';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('actual:read', async ({ req, session }) => {
  const query = parse(listActualsQuerySchema, Object.fromEntries(req.nextUrl.searchParams));
  const actuals = await getKitchenActuals(session, query);
  return { actuals };
});

export const POST = protectedRoute('actual:write', async ({ req, session }) => {
  const body = await req.json();
  const input = parse(recordActualSchema, body);
  const actual = await recordKitchenActual(session, input);
  return created({ actual });
});
