import { protectedRoute, parse } from '@/lib/http';
import { objectIdSchema } from '@/lib/validation';
import {
  getIndentById,
  updateIndentStatus,
} from '@/modules/planning/indent.service';
import { updateIndentStatusSchema } from '@/modules/planning/plan.schema';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('plan:read', async ({ params, session }) => {
  const indentId = parse(objectIdSchema, params?.id);
  const indent = await getIndentById(session, indentId);
  return { indent };
});

export const PATCH = protectedRoute('plan:write', async ({ req, params, session }) => {
  const indentId = parse(objectIdSchema, params?.id);
  const body = await req.json();
  const input = parse(updateIndentStatusSchema, body);
  const updated = await updateIndentStatus(session, indentId, input);
  return { indent: updated };
});
