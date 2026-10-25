// MySQL error 1452: a row references a parent row that does not exist.
const ER_NO_REFERENCED_ROW = 1452;

export class DuplicateKeyError extends Error {}

export const asDuplicateKey = (error: unknown): DuplicateKeyError | undefined =>
  typeof error === 'object' && error !== null && 'errno' in error && error.errno === 1062
    ? new DuplicateKeyError('Unique key already exists')
    : undefined;

/** A data-layer error that repositories raise instead of leaking driver details. */
export class ForeignKeyViolationError extends Error {
  constructor(readonly constraint: string) {
    super(`Foreign key constraint failed: ${constraint}`);
    this.name = 'ForeignKeyViolationError';
  }
}

/** Returns a typed error when `error` is a foreign key violation from the driver, otherwise undefined. */
export const asForeignKeyViolation = (error: unknown): ForeignKeyViolationError | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const { errno, sqlMessage } = error as { errno?: unknown; sqlMessage?: unknown };
  if (errno !== ER_NO_REFERENCED_ROW) return undefined;

  const constraint =
    typeof sqlMessage === 'string' ? /CONSTRAINT `([^`]+)`/.exec(sqlMessage)?.[1] : undefined;
  return new ForeignKeyViolationError(constraint ?? 'unknown');
};
