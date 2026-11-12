export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export const Errors = {
  unauthorized: () => new AppError('unauthorized', 'Please log in to continue.', 401),
  forbidden: () =>
    new AppError('forbidden', 'You do not have access to this action.', 403),
  notFound: (message = 'Not found') => new AppError('not_found', message, 404),
  invalid: (message = 'Invalid input') => new AppError('invalid_input', message, 422),
  quota: (message = 'Daily upload quota exceeded') =>
    new AppError('quota_exceeded', message, 429),
  rateLimited: () => new AppError('rate_limited', 'Too many requests.', 429),
  conflict: (message = 'Conflict') => new AppError('conflict', message, 409),
  server: (message = 'Server error') => new AppError('server_error', message, 500),
};

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}
