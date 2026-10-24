import { z } from 'zod';

// Building blocks for the form schemas of the features. The limits mirror the API (docs/API.md, "Input rules and
// limits"), which is the final judge: the form only saves a round trip and words the problem near the field.

/** A TEXT column holds 65535 bytes, not characters (an emoji takes 4 bytes). */
const MAX_TEXT_BYTES = 65_535;
const MAX_TITLE_CHARACTERS = 255;
const MIN_YEAR = 1000;
const MAX_YEAR = 9999;
/** The largest value of a signed MySQL INT column. */
export const MAX_INT = 2_147_483_647;
/** DECIMAL(12,2). */
const MAX_PRICE = 9_999_999_999.99;

const byteLength = (text: string): number => new TextEncoder().encode(text).length;
const characterCount = (text: string): number => Array.from(text).length;

/** A required line of text up to 255 characters, trimmed (like the API does). */
export const titleField = (emptyMessage: string) =>
  z
    .string()
    .trim()
    .min(1, emptyMessage)
    .refine((text) => characterCount(text) <= MAX_TITLE_CHARACTERS, 'Не более 255 символов');

/** Free text that may stay empty. */
export const textField = z
  .string()
  .refine((text) => byteLength(text) <= MAX_TEXT_BYTES, 'Слишком длинный текст');

/** `2017-06-29` as an `<input type="date">` gives it: a real calendar day in the years the database stores. */
export const isValidIsoDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < MIN_YEAR || year > MAX_YEAR) return false;
  return (
    day >= 1 && month >= 1 && month <= 12 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate()
  );
};

/** A date that may stay empty. */
export const optionalDateField = z
  .string()
  .refine((value) => value === '' || isValidIsoDate(value), 'Укажите дату полностью');

/** A date that must be there. */
export const requiredDateField = z
  .string()
  .min(1, 'Укажите дату')
  .refine(isValidIsoDate, 'Укажите дату полностью');

/** A positive whole number that fits an INT column, typed as text. */
export const wholeNumberField = (emptyMessage: string) =>
  z
    .string()
    .trim()
    .min(1, emptyMessage)
    .regex(/^\d+$/, 'Только цифры')
    .refine((value) => Number(value) >= 1, 'Число должно быть больше нуля')
    .refine((value) => Number(value) <= MAX_INT, 'Слишком большое число');

/** `100`, `99.5` and `99,50` (a comma is how many people type it): at most two decimals. */
export const parseMoney = (value: string): number => Number(value.trim().replace(',', '.'));

export const moneyField = (emptyMessage: string) =>
  z
    .string()
    .trim()
    .min(1, emptyMessage)
    .regex(/^\d+([.,]\d{1,2})?$/, 'Введите сумму, например 100 или 99,50')
    .refine((value) => parseMoney(value) <= MAX_PRICE, 'Слишком большая сумма');
