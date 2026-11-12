export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
export class ValidationError extends AppError {
  constructor(details: unknown) { super(400, 'VALIDATION_ERROR', 'Request validation failed', details); }
}
export class UnauthorizedError extends AppError {
  constructor(msg = 'Authentication required') { super(401, 'UNAUTHORIZED', msg); }
}
export class ForbiddenError extends AppError {
  constructor(msg = 'You do not have permission to do this') { super(403, 'FORBIDDEN', msg); }
}
export class NotFoundError extends AppError {
  constructor(msg = 'Not found') { super(404, 'NOT_FOUND', msg); }
}
export class ConflictError extends AppError {
  constructor(msg = 'Conflict') { super(409, 'CONFLICT', msg); }
}
export class RateLimitError extends AppError {
  constructor() { super(429, 'RATE_LIMITED', 'Too many requests, slow down'); }
}
