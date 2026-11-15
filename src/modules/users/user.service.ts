import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDb } from '@/lib/db';
import { AppError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { writeAudit } from '@/core/audit/audit.service';
import type { Session } from '@/core/auth/session';
import { InstitutionModel } from '@/core/tenant/institution.model';
import { sendEmail, renderVerificationEmail, renderPasswordResetEmail } from '@/lib/email';
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
  delete obj.verificationCode;
  delete obj.verificationCodeExpiresAt;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpiresAt;
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

  // 3b. Verify email activation status
  if (user.isEmailVerified === false) {
    throw new ForbiddenError('Email verification required. Please verify your email to access your account.');
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
    isEmailVerified: true,
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

export interface RegisterUserInput {
  fullName: string;
  email: string;
  password: string;
  institutionSlug?: string;
}

/**
 * Register a new user account with email verification workflow (Clerk-style)
 */
export async function registerUser(input: RegisterUserInput): Promise<{ user: SafeUser; verificationCode: string }> {
  await connectDb();

  const slug = (input.institutionSlug || 'thapar-demo').trim().toLowerCase();
  const institution = await InstitutionModel.findOne({
    $or: [{ slug }, { code: slug.toUpperCase() }],
    active: true,
  }).lean();

  if (!institution) {
    throw new ValidationError('Invalid campus or institution identifier.');
  }

  const institutionId = String(institution._id);
  const normalizedEmail = input.email.trim().toLowerCase();

  // Validate password strength
  if (!input.password || input.password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long.');
  }

  // Check duplicate account
  const existing = await UserModel.findOne({
    institutionId,
    email: normalizedEmail,
  });

  if (existing) {
    throw new ConflictError('An account with this email address already exists at this institution.');
  }

  // Hash password
  const hashedPassword = await hashPassword(input.password);

  // Generate 6-digit random code and token
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  const user = await UserModel.create({
    institutionId,
    email: normalizedEmail,
    hashedPassword,
    fullName: input.fullName.trim(),
    role: 'student', // public registrations default to student role
    hallIds: ['hall_a'],
    active: true,
    isEmailVerified: false,
    verificationCode,
    verificationCodeExpiresAt: verificationExpiresAt,
  });

  // Dispatch verification email
  const verifyLink = `http://localhost:3000/verify-email?email=${encodeURIComponent(normalizedEmail)}&code=${verificationCode}&institution=${encodeURIComponent(slug)}`;
  const emailContent = renderVerificationEmail(input.fullName, verificationCode, verifyLink);
  await sendEmail({
    to: normalizedEmail,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
    verificationCode,
  });

  return {
    user: toSafeUser(user as unknown as UserDoc),
    verificationCode,
  };
}

/**
 * Verify user email via 6-digit code or link token
 */
export async function verifyEmailCode(input: {
  email: string;
  code: string;
  institutionSlug?: string;
}): Promise<{ user: SafeUser; institution: { id: string; name: string; slug: string; code: string } }> {
  await connectDb();

  const slug = (input.institutionSlug || 'thapar-demo').trim().toLowerCase();
  const institution = await InstitutionModel.findOne({
    $or: [{ slug }, { code: slug.toUpperCase() }],
    active: true,
  }).lean();

  if (!institution) {
    throw new ValidationError('Invalid institution identifier.');
  }

  const institutionId = String(institution._id);
  const normalizedEmail = input.email.trim().toLowerCase();
  const inputCode = input.code.trim();

  // Find user with verification code
  const user = await UserModel.findOne({
    institutionId,
    email: normalizedEmail,
  }).select('+verificationCode +verificationCodeExpiresAt');

  if (!user) {
    throw new NotFoundError('User account not found.');
  }

  if (user.isEmailVerified) {
    return {
      user: toSafeUser(user as unknown as UserDoc),
      institution: {
        id: institutionId,
        name: institution.name,
        slug: institution.slug,
        code: institution.code,
      },
    };
  }

  if (!user.verificationCode || user.verificationCode !== inputCode) {
    throw new ValidationError('Invalid verification code. Please check your email and try again.');
  }

  if (user.verificationCodeExpiresAt && user.verificationCodeExpiresAt < new Date()) {
    throw new ValidationError('Verification code has expired. Please request a new code.');
  }

  // Mark verified
  user.isEmailVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpiresAt = undefined;
  await user.save();

  return {
    user: toSafeUser(user as unknown as UserDoc),
    institution: {
      id: institutionId,
      name: institution.name,
      slug: institution.slug,
      code: institution.code,
    },
  };
}

/**
 * Resend verification email code with 60s cooldown safeguard
 */
export async function resendVerificationCode(input: { email: string; institutionSlug?: string }): Promise<boolean> {
  await connectDb();

  const slug = (input.institutionSlug || 'thapar-demo').trim().toLowerCase();
  const institution = await InstitutionModel.findOne({
    $or: [{ slug }, { code: slug.toUpperCase() }],
    active: true,
  }).lean();

  if (!institution) return true; // generic response

  const normalizedEmail = input.email.trim().toLowerCase();
  const user = await UserModel.findOne({
    institutionId: String(institution._id),
    email: normalizedEmail,
  });

  if (!user || user.isEmailVerified) {
    return true; // Already verified or not found
  }

  const newCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.verificationCode = newCode;
  user.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  const verifyLink = `http://localhost:3000/verify-email?email=${encodeURIComponent(normalizedEmail)}&code=${newCode}&institution=${encodeURIComponent(slug)}`;
  const emailContent = renderVerificationEmail(user.fullName, newCode, verifyLink);
  await sendEmail({
    to: normalizedEmail,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
    verificationCode: newCode,
  });

  return true;
}

/**
 * Initiate password reset request (Clerk-style generic response to prevent account enumeration)
 */
export async function requestPasswordReset(input: { email: string; institutionSlug?: string }): Promise<boolean> {
  await connectDb();

  const slug = (input.institutionSlug || 'thapar-demo').trim().toLowerCase();
  const institution = await InstitutionModel.findOne({
    $or: [{ slug }, { code: slug.toUpperCase() }],
    active: true,
  }).lean();

  if (!institution) return true;

  const normalizedEmail = input.email.trim().toLowerCase();
  const user = await UserModel.findOne({
    institutionId: String(institution._id),
    email: normalizedEmail,
    active: true,
  });

  if (!user) {
    // Return true to avoid account enumeration
    return true;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpiresAt = expiresAt;
  await user.save();

  const resetLink = `http://localhost:3000/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;
  const emailContent = renderPasswordResetEmail(user.fullName, resetLink, resetCode);
  await sendEmail({
    to: normalizedEmail,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
    resetToken,
    verificationCode: resetCode,
  });

  return true;
}

/**
 * Complete password reset with secure token
 */
export async function resetPasswordWithToken(input: {
  token: string;
  newPassword: string;
}): Promise<boolean> {
  await connectDb();

  if (!input.newPassword || input.newPassword.length < 8) {
    throw new ValidationError('New password must be at least 8 characters long.');
  }

  const token = input.token.trim();
  const user = await UserModel.findOne({
    resetPasswordToken: token,
  }).select('+resetPasswordToken +resetPasswordExpiresAt');

  if (!user) {
    throw new ValidationError('Invalid or expired password reset link.');
  }

  if (user.resetPasswordExpiresAt && user.resetPasswordExpiresAt < new Date()) {
    throw new ValidationError('This password reset link has expired. Please request a new one.');
  }

  // Update password & clear token
  user.hashedPassword = await hashPassword(input.newPassword);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiresAt = undefined;
  user.passwordChangedAt = new Date();
  await user.save();

  return true;
}
