import { z } from 'zod';
import { ROLES } from '@/core/rbac/policy';

export const passwordValidation = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  institutionSlug: z.string().trim().min(1, 'Institution identifier is required').default('thapar-demo'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: passwordValidation,
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
  role: z.enum(ROLES),
  hallIds: z.array(z.string().trim()).default([]),
  active: z.boolean().default(true),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  role: z.enum(ROLES).optional(),
  hallIds: z.array(z.string().trim()).optional(),
  active: z.boolean().optional(),
  password: passwordValidation.optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const listUsersQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  skip: z.coerce.number().int().min(0).default(0),
  role: z.enum(ROLES).optional(),
  active: z.enum(['true', 'false']).optional(),
  search: z.string().trim().optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuery>;
