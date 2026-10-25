// Domain errors: they say what went wrong, not how to show it. The HTTP layer maps them to statuses
// (see shared/http/errorHandler.ts), so services can be reused from other transports (sockets, GraphQL).

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** The input is not acceptable: malformed, or it breaks a business rule. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ConflictError extends Error {}
export class ForbiddenError extends Error {}
export class RateLimitError extends Error {
  constructor(readonly retryAfter: number) {
    super('Too many attempts. Try again later.');
    this.name = 'RateLimitError';
  }
}
