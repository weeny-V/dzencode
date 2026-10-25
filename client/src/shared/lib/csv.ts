import { DEFAULT_LOCALE, type Locale } from '@/shared/i18n/config';
import { getNumberFormat } from '@/shared/i18n/formats';

export type CsvCell = string | number | boolean | null | undefined;

export interface CsvColumn<Row> {
  header: string;
  value: (row: Row) => CsvCell;
}

const BOM = '﻿';
const NEWLINE = '\r\n';

/**
 * Excel in a Russian locale splits cells on a semicolon (the comma is its decimal separator); everywhere else the
 * comma is the delimiter. The decimal separator of a number follows the same locale (see `formatCsvNumber`).
 */
export const csvDelimiter = (locale: Locale): string => (locale === 'ru' ? ';' : ',');

/** A plain number without grouping, with the locale's decimal separator. */
export const formatCsvNumber = (value: number, locale: Locale = DEFAULT_LOCALE): string =>
  String(Math.round(value * 100) / 100).replace('.', getNumberFormat(locale).decimalSeparator);

// A cell that starts with one of these is read as a formula by spreadsheet programs ("CSV injection").
const FORMULA_START = /^[=+\-@\t\r]/;

/** One field: formula-looking text is neutralized with a leading apostrophe, then quoted when it needs it. */
export const csvField = (cell: CsvCell, delimiter: string): string => {
  if (cell === null || cell === undefined) return '';
  let text = typeof cell === 'string' ? cell : String(cell);
  if (typeof cell === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return text.includes(delimiter) || /["\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
};

/** UTF-8 text with a byte order mark (Excel needs it for Cyrillic), CRLF line ends and a header row. */
export const buildCsv = <Row>(
  columns: readonly CsvColumn<Row>[],
  rows: readonly Row[],
  delimiter: string,
): string => {
  const line = (cells: CsvCell[]) => cells.map((cell) => csvField(cell, delimiter)).join(delimiter);
  const lines = [line(columns.map((column) => column.header))];
  for (const row of rows) lines.push(line(columns.map((column) => column.value(row))));
  return BOM + lines.join(NEWLINE) + NEWLINE;
};
