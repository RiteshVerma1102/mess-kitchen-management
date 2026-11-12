import { protectedRoute, parse, created } from '@/lib/http';
import {
  generateIndentFromShortages,
  createManualIndent,
  getIndents,
} from '@/modules/planning/indent.service';
import {
  generateIndentFromShortagesSchema,
  createManualIndentSchema,
  listIndentsQuerySchema,
} from '@/modules/planning/plan.schema';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('plan:read', async ({ req, session }) => {
  const query = parse(listIndentsQuerySchema, Object.fromEntries(req.nextUrl.searchParams));
  const result = await getIndents(session, query);
  return result;
});

export const POST = protectedRoute('plan:write', async ({ req, session }) => {
  const body = await req.json();

  if (body.type === 'manual') {
    const input = parse(createManualIndentSchema, body);
    const indent = await createManualIndent(session, input);
    return created({ indent });
  } else {
    const input = parse(generateIndentFromShortagesSchema, body);
    const indent = await generateIndentFromShortages(session, input);
    return created({ indent });
  }
});
