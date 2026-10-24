import type { ErrorRequestHandler, RequestHandler } from 'express';

import { NotFoundError, ValidationError } from '../errors.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

/** Status of a client error raised by Express itself (e.g. body-parser's 413), if `err` is one. */
const expressClientStatus = (err: unknown): number | undefined => {
  if (typeof err !== 'object' || err === null) return undefined;
  const { status, expose } = err as { status?: unknown; expose?: unknown };
  const isClientError = typeof status === 'number' && status >= 400 && status < 500;
  return isClientError && expose === true ? status : undefined;
};

/** The single place where domain errors become HTTP statuses. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
    return;
  }
  // express.json() rejects a malformed body with a SyntaxError that already carries status 400.
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  const status = expressClientStatus(err);
  if (status !== undefined && err instanceof Error) {
    res.status(status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
