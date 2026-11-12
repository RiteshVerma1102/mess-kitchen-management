import { protectedRoute, parse, created } from '@/lib/http';
import { createUserSchema, listUsersQuery } from '@/modules/users/user.schema';
import { createUser, listUsers } from '@/modules/users/user.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute('user:manage', async ({ req, session }) => {
  const query = parse(listUsersQuery, Object.fromEntries(req.nextUrl.searchParams));
  return listUsers(session, query);
});

export const POST = protectedRoute('user:manage', async ({ req, session, ip }) => {
  const body = parse(createUserSchema, await req.json());
  return created(await createUser(session, body, ip));
});
