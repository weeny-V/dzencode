import { DEFAULT_LOCALE, type Locale } from '@/shared/i18n/config';
import { getNumberFormat } from '@/shared/i18n/formats';

/** A price in one currency, as the API returns it (`symbol` holds the currency code). */
export interface Price {
  value: number;
  symbol: string;
  isDefault: boolean;
}

const SIGNS: Record<string, string> = { USD: '$', EUR: '€' };

/** `$` for USD and € for EUR, the currency code for the rest (`UAH`). */
export const currencySign = (code: string): string => SIGNS[code] ?? code;

/**
 * English uses comma groups and a decimal point; Russian uses non-breaking groups and a decimal comma.
 * Cents are shown only when nonzero.
 * Written by hand because `Intl` output differs between Node and browsers and would break hydration.
 */
export const formatAmount = (value: number, locale: Locale = DEFAULT_LOCALE): string => {
  const { groupSeparator, decimalSeparator } = getNumberFormat(locale);
  const [integer = '0', cents = '00'] = value.toFixed(2).split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);
  return cents === '00' ? grouped : `${grouped}${decimalSeparator}${cents}`;
};
