import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import mongoose from 'mongoose';
import { AppError, ValidationError } from './errors';
import { logger } from './logger';
import { enforceRateLimit } from './rate-limit';
import { connectDb } from './db';
import { getSession } from '@/core/auth/jwt';
import { assertCan, type Permission } from '@/core/rbac/policy';
import type { Session } from '@/core/auth/session';

export interface RouteCtx<P> { req: NextRequest; session: Session; params: P; ip: string }

export const clientIp = (req: NextRequest): string =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

export const created = (data: unknown) => NextResponse.json({ data }, { status: 201 });

// One consistent error shape for every endpoint.
export function errorResponse(e: unknown, requestId: string) {
  if (e instanceof ZodError) e = new ValidationError(e.flatten());
  if (e instanceof mongoose.Error.CastError || (e as Error)?.name === 'CastError') {
    e = new AppError(400, 'INVALID_ID', 'Invalid identifier format', {
      path: (e as mongoose.Error.CastError).path,
      value: (e as mongoose.Error.CastError).value,
    });
  }
  if (e instanceof mongoose.Error.ValidationError || (e as Error)?.name === 'ValidationError') {
    e = new AppError(400, 'VALIDATION_ERROR', (e as Error).message, (e as mongoose.Error.ValidationError).errors);
  }
  if (e instanceof AppError) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message, details: e.details, requestId } },
      { status: e.status },
    );
  }
  logger.error({ err: (e as Error)?.message, requestId }, 'unhandled error');
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Something went wrong', requestId } },
    { status: 500 },
  );
}

// Every protected endpoint goes through here: authenticate -> rate limit ->
// authorise (permission) -> handler. UI hiding is not authorisation; this is.
export function protectedRoute<P = Record<string, string>>(
  permission: Permission,
  handler: (ctx: RouteCtx<P>) => Promise<unknown>,
) {
  return async (req: NextRequest, routeCtx: { params: P }) => {
    const requestId = crypto.randomUUID();
    try {
      const session = await getSession(req);
      await enforceRateLimit(`u:${session.userId}`);
      assertCan(session, permission);
      await connectDb();
      const result = await handler({ req, session, params: routeCtx?.params, ip: clientIp(req) });
      return result instanceof Response ? result : NextResponse.json({ data: result });
    } catch (e) {
      return errorResponse(e, requestId);
    }
  };
}

export function parse<S extends ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  return schema.parse(input); // ZodError is converted to a 400 by errorResponse
}
