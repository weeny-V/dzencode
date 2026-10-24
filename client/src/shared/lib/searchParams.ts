/** The `searchParams` prop of a Next.js page: a promise of the query string. A repeated key gives an array. */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const MAX_SEARCH_LENGTH = 100;

/** `?q=text`: a single string, trimmed. A missing, repeated or over-long value means "no search" (an empty string). */
export const parseSearch = (value: string | string[] | undefined): string => {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  return text.length > MAX_SEARCH_LENGTH ? '' : text;
};

/** `?a=1&b=2`, or an empty string when there is nothing to put in the address. Empty and missing values are left out. */
export const toQuery = (params: Record<string, string | undefined>): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const text = query.toString();
  return text ? `?${text}` : '';
};

/** The query string of `current` with one parameter set (or removed when `value` is empty); the others are kept. */
export const withParam = (current: URLSearchParams, key: string, value: string): string => {
  const next = new URLSearchParams(current);
  if (value) next.set(key, value);
  else next.delete(key);
  const text = next.toString();
  return text ? `?${text}` : '';
};

/** `?order=2`: a positive integer of up to ten digits. Anything else (or a repeated key) is ignored. */
export const parsePositiveInt = (value: string | string[] | undefined): number | undefined => {
  if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value)) return undefined;
  return Number(value);
};
