import { ValidationError } from '../../shared/errors.js';
import type { InventoryCurrency } from '../products/index.js';

export const parseInventoryCurrency = (value: unknown): InventoryCurrency => {
  if (value === undefined) return 'UAH';
  if (value === 'UAH' || value === 'USD') return value;
  throw new ValidationError('currency must be UAH or USD');
};
