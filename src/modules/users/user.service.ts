import bcrypt from 'bcryptjs';
import { connectDb } from '@/lib/db';
import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import { writeAudit } from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import { InstitutionModel } from '@/core/tenant/institution.model';
import { userRepository } from './user.repository';
import { UserModel, type IUser, type UserDoc, type SafeUser } from './user.model';
import type { CreateUserInput, LoginInput, UpdateUserInput, ListUsersQuery } from './user.schema';

const BCRYPT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function toSafeUser(user: UserDoc | (IUser & { _id: unknown; createdAt?: Date; updatedAt?: Date })): SafeUser {
  const obj = typeof (user as { toObject?: () => unknown }).toObject === 'function'
    ? (user as unknown as { toObject: () => Record<string, unknown> }).toObject()
    : { ...(user as unknown as Record<string, unknown>) };

  delete obj.hashedPassword;
  return obj as unknown as SafeUser;
}

export interface AuthResult {
  session: Session;
  user: SafeUser;
  institution: {
    id: string;
    name: string;
    code: string;
    slug: string;
  };
}

export async function authenticateUser(input: LoginInput): Promise<AuthResult> {
  await connectDb();

  // 1. Resolve institution by slug or code
  const institution = await InstitutionModel.findOne({
    $or: [
      { slug: input.institutionSlug.toLowerCase() },
      { code: input.institutionSlug.toUpperCase() },
    ],
    active: true,
  }).lean();

  if (!institution) {
    throw new UnauthorizedError('Invalid institution identifier');
  }

  const institutionId = String(institution._id);

  // 2. Find user in institution
  const user = await UserModel.findOne({
    institutionId,
    email: input.email.toLowerCase(),
  });

  if (!user || !user.active) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // 3. Verify password
  const isValid = await verifyPassword(input.password, user.hashedPassword);
  if (!isValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // 4. Update last login
  user.lastLoginAt = new Date();
  await user.save();

  const safeUser = toSafeUser(user as unknown as UserDoc);
  const session: Session = {
    userId: user._id.toString(),
    institutionId,
    role: user.role,
    hallIds: user.hallIds || [],
  };

  return {
    session,
    user: safeUser,
    institution: {
      id: institutionId,
      name: institution.name,
      code: institution.code,
      slug: institution.slug,
    },
  };
}

export async function createUser(session: Session, input: CreateUserInput, ip?: string): Promise<SafeUser> {
  await connectDb();
  const repo = userRepository(session.institutionId);

  // Check email conflict
  const existing = await UserModel.findOne({
    institutionId: session.institutionId,
    email: input.email.toLowerCase(),
  }).lean();

  if (existing) {
    throw new ConflictError(`User with email "${input.email}" already exists`);
  }

  const hashedPassword = await hashPassword(input.password);

  const created = await repo.create({
    email: input.email.toLowerCase(),
    hashedPassword,
    fullName: input.fullName,
    role: input.role,
    hallIds: input.hallIds || [],
    active: input.active ?? true,
    isSynthetic: false,
  });

  const safe = toSafeUser(created as unknown as UserDoc);

  await writeAudit({
    session,
    ip,
    action: 'user.create',
    target: { type: 'User', id: safe._id.toString() },
    after: { email: safe.email, role: safe.role, fullName: safe.fullName },
  });

  return safe;
}

export async function updateUser(
  session: Session,
  userId: string,
  input: UpdateUserInput,
  ip?: string,
): Promise<SafeUser> {
  await connectDb();
  const repo = userRepository(session.institutionId);

  const existing = await repo.get(userId);
  if (!existing) {
    throw new NotFoundError('User not found');
  }

  const updateData: Partial<IUser> = {};
  if (input.fullName !== undefined) updateData.fullName = input.fullName;
  if (input.role !== undefined) updateData.role = input.role;
  if (input.hallIds !== undefined) updateData.hallIds = input.hallIds;
  if (input.active !== undefined) updateData.active = input.active;
  if (input.password) {
    updateData.hashedPassword = await hashPassword(input.password);
    updateData.passwordChangedAt = new Date();
  }

  const updated = await repo.update(userId, updateData);
  if (!updated) {
    throw new NotFoundError('User not found after update');
  }

  const safe = toSafeUser(updated as unknown as UserDoc);

  await writeAudit({
    session,
    ip,
    action: 'user.update',
    target: { type: 'User', id: userId },
    before: { role: existing.role, active: existing.active },
    after: { role: safe.role, active: safe.active },
  });

  return safe;
}

export async function deleteUser(session: Session, userId: string, ip?: string): Promise<{ success: boolean; id: string }> {
  await connectDb();

  // Prevent deleting oneself
  if (session.userId === userId) {
    throw new AppError(400, 'SELF_DELETE_FORBIDDEN', 'You cannot delete your own account');
  }

  const repo = userRepository(session.institutionId);
  const existing = await repo.get(userId);
  if (!existing) {
    throw new NotFoundError('User not found');
  }

  // Soft deactivate
  await repo.update(userId, { active: false });

  await writeAudit({
    session,
    ip,
    action: 'user.deactivate',
    target: { type: 'User', id: userId },
    before: { active: existing.active },
    after: { active: false },
  });

  return { success: true, id: userId };
}

export async function listUsers(
  session: Session,
  opts: ListUsersQuery,
): Promise<{ users: SafeUser[]; total: number; limit: number; skip: number }> {
  await connectDb();
  const repo = userRepository(session.institutionId);

  const filter: Record<string, unknown> = {};
  if (opts.role) filter.role = opts.role;
  if (opts.active !== undefined) filter.active = opts.active === 'true';
  if (opts.search) {
    filter.$or = [
      { fullName: { $regex: opts.search, $options: 'i' } },
      { email: { $regex: opts.search, $options: 'i' } },
    ];
  }

  const [rawUsers, total] = await Promise.all([
    repo.list(filter, { limit: opts.limit, skip: opts.skip, sort: { createdAt: -1 } }),
    repo.count(filter),
  ]);

  const users = (rawUsers as unknown as UserDoc[]).map(toSafeUser);
  return { users, total, limit: opts.limit, skip: opts.skip };
}

export async function getUserById(session: Session, userId: string): Promise<SafeUser> {
  await connectDb();
  const repo = userRepository(session.institutionId);
  const user = await repo.get(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return toSafeUser(user as unknown as UserDoc);
}

export async function getUserProfile(session: Session): Promise<SafeUser & { institution: { name: string; slug: string; code: string } }> {
  await connectDb();
  const repo = userRepository(session.institutionId);
  const user = await repo.get(session.userId);
  if (!user) {
    throw new NotFoundError('Current user profile not found');
  }

  const institution = await InstitutionModel.findById(session.institutionId).lean();

  return {
    ...toSafeUser(user as unknown as UserDoc),
    institution: {
      name: institution?.name ?? 'Unknown Institution',
      slug: institution?.slug ?? 'default',
      code: institution?.code ?? 'DEFAULT',
    },
  };
}
