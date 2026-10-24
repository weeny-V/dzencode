/** A price in one currency, as the API returns it (`symbol` holds the currency code). */
export interface Price {
  value: number;
  symbol: string;
  isDefault: boolean;
}

const SIGNS: Record<string, string> = { USD: '$', EUR: '€' };

// A non-breaking space, written as a code so that an editor or formatter cannot turn it into a plain space.
const NBSP = String.fromCharCode(0xa0);

/** `$` for USD and € for EUR, the currency code for the rest (`UAH`). */
export const currencySign = (code: string): string => SIGNS[code] ?? code;

/**
 * `250 000.50`, `50`: groups of thousands separated by a non-breaking space, cents only when there are some.
 * Written by hand because `Intl` output differs between Node and browsers and would break hydration.
 */
export const formatAmount = (value: number): string => {
  const [integer = '0', cents = '00'] = value.toFixed(2).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return cents === '00' ? grouped : `${grouped}.${cents}`;
};
