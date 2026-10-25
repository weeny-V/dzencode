import type { Locale } from './config';

interface NumberFormat {
  groupSeparator: string;
  decimalSeparator: string;
}

// Keep the Russian grouping space non-breaking so an amount cannot wrap between groups.
const NBSP = String.fromCharCode(0xa0);

const NUMBER_FORMATS = {
  en: { groupSeparator: ',', decimalSeparator: '.' },
  ru: { groupSeparator: NBSP, decimalSeparator: ',' },
} satisfies Record<Locale, NumberFormat>;

export const getNumberFormat = (locale: Locale): NumberFormat => NUMBER_FORMATS[locale];
