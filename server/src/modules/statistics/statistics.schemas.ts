import { ValidationError } from '../../shared/errors.js';

export const DEFAULT_GRAPH_ORDER_LIMIT = 40;
export const MAX_GRAPH_ORDER_LIMIT = 100;

export const parseGraphOrderLimit = (value: number | null | undefined): number => {
  if (value === undefined || value === null) return DEFAULT_GRAPH_ORDER_LIMIT;
  if (!Number.isInteger(value) || value < 1 || value > MAX_GRAPH_ORDER_LIMIT)
    throw new ValidationError(`limit must be an integer from 1 to ${MAX_GRAPH_ORDER_LIMIT}`);
  return value;
};
