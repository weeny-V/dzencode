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
