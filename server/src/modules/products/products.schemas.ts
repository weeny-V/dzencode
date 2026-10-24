import {
  asObject,
  bad,
  optionalDate,
  optionalString,
  optionalText,
  parseDate,
  requiredBoolean,
  requiredInt,
  requiredString,
} from '../../shared/validation.js';
import type { Price, ProductFilter, ProductInput } from './products.types.js';

/** DECIMAL(12,2): ten digits before the point, two after. */
const MAX_PRICE = 9_999_999_999.99;

const hasAtMostTwoDecimals = (value: number): boolean =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

const parsePrices = (value: unknown): Price[] => {
  if (!Array.isArray(value) || value.length === 0) return bad('price must be a non-empty array');

  const prices = value.map((item, index): Price => {
    const entry = asObject(item, `price[${index}]`);
    const amount = entry.value;
    if (
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > MAX_PRICE
    ) {
      return bad(`price[${index}].value must be a number between 0 and ${MAX_PRICE}`);
    }
    if (!hasAtMostTwoDecimals(amount)) {
      return bad(`price[${index}].value must have at most 2 decimal places`);
    }
    return {
      value: amount,
      // Currency codes are stored upper-case, so `usd` and `USD` are the same currency.
      symbol: requiredString(entry, 'symbol', 8).toUpperCase(),
      isDefault: requiredBoolean(entry, 'isDefault'),
    };
  });

  if (prices.filter((price) => price.isDefault).length !== 1) {
    bad('exactly one price must have isDefault: true');
  }
  if (new Set(prices.map((price) => price.symbol)).size !== prices.length) {
    bad('price symbols must be unique');
  }
  return prices;
};

export const parseProductInput = (raw: unknown): ProductInput => {
  const body = asObject(raw, 'body');
  const guarantee = asObject(body.guarantee, 'guarantee');
  const start = parseDate(guarantee.start, 'guarantee.start');
  const end = parseDate(guarantee.end, 'guarantee.end');
  if (end < start) bad('guarantee.end must not be earlier than guarantee.start');

  return {
    title: requiredString(body, 'title'),
    serialNumber: requiredInt(body, 'serialNumber'),
    isNew: requiredBoolean(body, 'isNew'),
    photo: optionalString(body, 'photo'),
    type: requiredString(body, 'type', 100),
    specification: optionalText(body, 'specification'),
    guarantee: { start, end },
    price: parsePrices(body.price),
    order: requiredInt(body, 'order'),
    date: optionalDate(body, 'date'),
  };
};

/** Query string of `GET /products`: an empty `type` means no filter. */
export const parseProductFilter = (query: Record<string, unknown>): ProductFilter => {
  const { type } = query;
  if (type === undefined || type === '') return {};
  if (typeof type !== 'string') return bad('type must be a single string');
  return { type };
};
