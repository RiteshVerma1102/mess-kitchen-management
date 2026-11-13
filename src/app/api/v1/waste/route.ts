import { protectedRoute, parse, created } from '@/lib/http';
import {
  recordFoodWaste,
  getFoodWasteList,
} from '@/modules/waste/waste.service';
import {
  recordWasteSchema,
  listWasteQuerySchema,
} from '@/modules/waste/waste.schema';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('waste:read', async ({ req, session }) => {
  const query = parse(listWasteQuerySchema, Object.fromEntries(req.nextUrl.searchParams));
  const result = await getFoodWasteList(session, query);
  return result;
});

export const POST = protectedRoute('actual:write', async ({ req, session }) => {
  const body = await req.json();
  const input = parse(recordWasteSchema, body);
  const waste = await recordFoodWaste(session, input);
  return created({ waste });
});
