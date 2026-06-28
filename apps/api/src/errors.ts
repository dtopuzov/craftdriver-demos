import type { ErrorCode } from '@exam/contracts';

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

export const unauthenticated = () => new ApiError('UNAUTHENTICATED', 'Sign in is required.', 401);
export const forbidden = () =>
  new ApiError('FORBIDDEN', 'You do not have access to this resource.', 403);
export const notFound = () => new ApiError('NOT_FOUND', 'Resource not found.', 404);
export const emailAlreadyRegistered = () =>
  new ApiError('VALIDATION_ERROR', 'An account with this email already exists. Please sign in instead.', 400);
export const invalidState = (message: string) => new ApiError('INVALID_STATE', message, 409);
