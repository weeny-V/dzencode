import { asObject, optionalDate, optionalText, requiredString } from '../../shared/validation.js';
import type { OrderInput } from './orders.types.js';

export const parseOrderInput = (raw: unknown): OrderInput => {
  const body = asObject(raw, 'body');
  return {
    title: requiredString(body, 'title'),
    description: optionalText(body, 'description'),
    date: optionalDate(body, 'date'),
  };
};
