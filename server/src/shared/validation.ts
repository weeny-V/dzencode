import { ValidationError } from './errors.js';

// Hand-written input checks shared by the modules' `*.schemas.ts` files. Stage 5 (forms) may replace them
// with a schema library without touching services. The limits mirror the database columns, so a value that
// passes here is not rejected by MySQL later (that would surface as a 500).

export type Body = Record<string, unknown>;

/** Largest value of a signed MySQL INT column. */
export const MAX_INT = 2_147_483_647;
/** A MySQL TEXT column holds 65535 bytes (not characters). */
const MAX_TEXT_BYTES = 65_535;
/** MySQL DATETIME range, by year. */
const MIN_YEAR = 1000;
const MAX_YEAR = 9999;

export const bad = (message: string): never => {
  throw new ValidationError(message);
};

export const asObject = (value: unknown, name: string): Body =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Body)
    : bad(`${name} must be an object`);

/** VARCHAR(n) limits characters (code points), not UTF-16 units: an emoji counts as one. */
const characterCount = (value: string): number => Array.from(value).length;

export const requiredString = (body: Body, key: string, maxLength = 255): string => {
  const value = body[key];
  if (typeof value !== 'string' || value.trim() === '') return bad(`${key} is required`);
  if (characterCount(value) > maxLength) {
    return bad(`${key} must be at most ${maxLength} characters`);
  }
  return value.trim();
};

export const optionalString = (body: Body, key: string, maxLength = 255): string | null => {
  const value = body[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return bad(`${key} must be a string`);
  if (characterCount(value) > maxLength) {
    return bad(`${key} must be at most ${maxLength} characters`);
  }
  return value;
};

/** For TEXT columns: the limit is in bytes. */
export const optionalText = (body: Body, key: string): string | null => {
  const value = body[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return bad(`${key} must be a string`);
  if (Buffer.byteLength(value, 'utf8') > MAX_TEXT_BYTES) {
    return bad(`${key} must be at most ${MAX_TEXT_BYTES} bytes`);
  }
  return value;
};

/** A positive integer that fits a MySQL INT column. */
export const requiredInt = (body: Body, key: string): number => {
  const value = body[key];
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= MAX_INT
    ? value
    : bad(`${key} must be an integer between 1 and ${MAX_INT}`);
};

export const requiredBoolean = (body: Body, key: string): boolean => {
  const value = body[key];
  return typeof value === 'boolean' ? value : bad(`${key} must be true or false`);
};

// 2017-06-29, 2017-06-29T12:09:33Z, 2017-06-29 12:09:33, 2017-06-29T12:09:33.123+03:00
const DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Accepts ISO 8601 only. A date without a zone is UTC (the database stores UTC), so the result does not
 * depend on the server's time zone. Fractions of a second are dropped: DATETIME has second precision.
 */
export const parseDate = (value: unknown, name: string): Date => {
  const message = `${name} must be an ISO 8601 date, e.g. 2017-06-29T12:09:33Z`;
  const match = typeof value === 'string' ? DATE_PATTERN.exec(value.trim()) : null;
  if (!match) return bad(message);

  const part = (index: number, fallback = '00') => match[index] ?? fallback;
  const [year, month, day] = [Number(part(1)), Number(part(2)), Number(part(3))];
  const [hour, minute, second] = [Number(part(4)), Number(part(5)), Number(part(6))];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return bad(message);
  if (hour > 23 || minute > 59 || second > 59) return bad(message);

  const date = new Date(
    `${part(1)}-${part(2)}-${part(3)}T${part(4)}:${part(5)}:${part(6)}${part(7, 'Z')}`,
  );
  if (Number.isNaN(date.getTime())) return bad(message);
  const utcYear = date.getUTCFullYear();
  if (utcYear < MIN_YEAR || utcYear > MAX_YEAR)
    return bad(`${name} must be between years ${MIN_YEAR} and ${MAX_YEAR}`);
  return date;
};

/** Missing date means "now", truncated to whole seconds like every stored date. */
export const optionalDate = (body: Body, key: string): Date =>
  body[key] === undefined
    ? new Date(Math.floor(Date.now() / 1000) * 1000)
    : parseDate(body[key], key);

/** Route parameter such as `/orders/:id`. */
export const parseId = (value: string | undefined): number => {
  const id = value !== undefined && /^[1-9]\d*$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(id) && id <= MAX_INT ? id : bad('id must be a positive integer');
};
