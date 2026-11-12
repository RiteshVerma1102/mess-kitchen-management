import { protectedRoute, parse, created } from '@/lib/http';
import {
  generateDailyKitchenPlan,
  getDailyKitchenPlans,
} from '@/modules/planning/plan.service';
import {
  generatePlanSchema,
  listPlansQuerySchema,
} from '@/modules/planning/plan.schema';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('plan:read', async ({ req, session }) => {
  const query = parse(listPlansQuerySchema, Object.fromEntries(req.nextUrl.searchParams));
  const plans = await getDailyKitchenPlans(session, query);
  return { plans };
});

export const POST = protectedRoute('plan:write', async ({ req, session }) => {
  const body = await req.json();
  const input = parse(generatePlanSchema, body);
  const plan = await generateDailyKitchenPlan(session, input);
  return created({ plan });
});
