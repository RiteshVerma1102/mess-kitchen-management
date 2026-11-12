import { protectedRoute, parse } from '@/lib/http';
import { objectIdSchema } from '@/lib/validation';
import {
  getPlanWithRequirements,
  updatePreparationPlan,
} from '@/modules/planning/plan.service';
import { updatePlanSchema } from '@/modules/planning/plan.schema';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('plan:read', async ({ params, session }) => {
  const planId = parse(objectIdSchema, params?.id);
  const data = await getPlanWithRequirements(session, planId);
  return data;
});

export const PATCH = protectedRoute('plan:write', async ({ req, params, session }) => {
  const planId = parse(objectIdSchema, params?.id);
  const body = await req.json();
  const input = parse(updatePlanSchema, body);
  const updated = await updatePreparationPlan(session, planId, input);
  return { plan: updated };
});
