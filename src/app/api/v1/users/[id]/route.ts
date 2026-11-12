import { protectedRoute, parse } from '@/lib/http';
import { objectIdSchema } from '@/lib/validation';
import { updateUserSchema } from '@/modules/users/user.schema';
import { getUserById, updateUser, deleteUser } from '@/modules/users/user.service';

export const dynamic = 'force-dynamic';

export const GET = protectedRoute<{ id: string }>('user:manage', async ({ params, session }) => {
  const id = parse(objectIdSchema, params.id);
  return getUserById(session, id);
});

export const PATCH = protectedRoute<{ id: string }>('user:manage', async ({ req, params, session, ip }) => {
  const id = parse(objectIdSchema, params.id);
  const body = parse(updateUserSchema, await req.json());
  return updateUser(session, id, body, ip);
});

export const DELETE = protectedRoute<{ id: string }>('user:manage', async ({ params, session, ip }) => {
  const id = parse(objectIdSchema, params.id);
  return deleteUser(session, id, ip);
});
