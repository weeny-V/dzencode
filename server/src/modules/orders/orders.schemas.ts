import {
  asObject,
  optionalDate,
  optionalText,
  parseSearchQuery,
  requiredString,
} from '../../shared/validation.js';
import type { OrderFilter, OrderInput } from './orders.types.js';

export const parseOrderInput = (raw: unknown): OrderInput => {
  const body = asObject(raw, 'body');
  return {
    title: requiredString(body, 'title'),
    description: optionalText(body, 'description'),
    date: optionalDate(body, 'date'),
  };
};

/** Query string of `GET /orders`: `q` is the search text. */
export const parseOrderFilter = (query: Record<string, unknown>): OrderFilter => {
  const search = parseSearchQuery(query.q);
  return search === undefined ? {} : { query: search };
};
