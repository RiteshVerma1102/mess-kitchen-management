import { z } from 'zod';

// MongoDB ObjectId validation schema (24 hex characters)
export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId: must be 24 hex characters');
