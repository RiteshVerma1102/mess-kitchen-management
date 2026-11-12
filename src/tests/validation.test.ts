import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { objectIdSchema } from '@/lib/validation';
import { errorResponse } from '@/lib/http';

describe('objectIdSchema', () => {
  it('accepts valid 24-character hex strings', () => {
    const validId = '507f1f77bcf86cd799439011';
    const result = objectIdSchema.safeParse(validId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(validId);
    }
  });

  it('rejects malformed ids (too short, non-hex, etc.)', () => {
    expect(objectIdSchema.safeParse('123').success).toBe(false);
    expect(objectIdSchema.safeParse('not-a-valid-hex-id-1234567').success).toBe(false);
    expect(objectIdSchema.safeParse('507f1f77bcf86cd79943901z').success).toBe(false);
    expect(objectIdSchema.safeParse('').success).toBe(false);
  });
});

describe('errorResponse handling of bad IDs and Mongoose validation errors', () => {
  it('maps mongoose CastError to 400 INVALID_ID instead of 500', async () => {
    const castError = new mongoose.Error.CastError('ObjectId', 'invalid-id-xyz', 'dishId');
    const res = errorResponse(castError, 'req-test-1');

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatchObject({
      code: 'INVALID_ID',
      message: 'Invalid identifier format',
      requestId: 'req-test-1',
    });
  });

  it('maps mongoose ValidationError to 400 VALIDATION_ERROR instead of 500', async () => {
    const valError = new mongoose.Error.ValidationError();
    valError.message = 'Path `name` is required';
    const res = errorResponse(valError, 'req-test-2');

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      requestId: 'req-test-2',
    });
  });
});
