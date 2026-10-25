import { describe, expect, it } from 'vitest';

import { buildCsv, csvDelimiter, csvField, formatCsvNumber } from './csv';

describe('csv fields', () => {
  it.each([
    ['plain', 'plain'],
    ['with, comma', '"with, comma"'],
    ['with "quotes"', '"with ""quotes"""'],
    ['two\nlines', '"two\nlines"'],
    ['carriage\rreturn', '"carriage\rreturn"'],
  ])('quotes %j when needed', (input, expected) => {
    expect(csvField(input, ',')).toBe(expected);
  });
  it('quotes by the delimiter in use only', () => {
    expect(csvField('a;b', ',')).toBe('a;b');
    expect(csvField('a;b', ';')).toBe('"a;b"');
    expect(csvField('a,b', ';')).toBe('a,b');
  });
  it.each(['=1+1', '+7', '-2', '@SUM(A1)', '\tcmd', '\rcmd'])(
    'neutralizes the formula-looking text %j',
    (input) => {
      expect(csvField(input, ',').replace(/^"/, '')).toMatch(/^'/);
    },
  );
  it('keeps negative numbers and booleans as they are, because only text can be a formula', () => {
    expect(csvField(-5, ',')).toBe('-5');
    expect(csvField(true, ',')).toBe('true');
    expect(csvField(0, ',')).toBe('0');
  });
  it('writes null and undefined as empty cells', () => {
    expect(csvField(null, ',')).toBe('');
    expect(csvField(undefined, ',')).toBe('');
  });
});

describe('csv numbers and delimiters', () => {
  it('follows the locale', () => {
    expect(csvDelimiter('en')).toBe(',');
    expect(csvDelimiter('ru')).toBe(';');
    expect(formatCsvNumber(1234.5, 'en')).toBe('1234.5');
    expect(formatCsvNumber(1234.5, 'ru')).toBe('1234,5');
    expect(formatCsvNumber(0.1 + 0.2, 'en')).toBe('0.3');
    expect(formatCsvNumber(7, 'ru')).toBe('7');
  });
});

describe('csv document', () => {
  const columns = [
    { header: 'Id', value: (row: { id: number; title: string }) => row.id },
    { header: 'Title', value: (row: { id: number; title: string }) => row.title },
  ];
  it('starts with a BOM, has a header, CRLF line ends and a final newline', () => {
    const text = buildCsv(columns, [{ id: 1, title: 'A, B' }], ',');
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text.slice(1)).toBe('Id,Title\r\n1,"A, B"\r\n');
  });
  it('writes only the header for no rows', () => {
    expect(buildCsv(columns, [], ';').slice(1)).toBe('Id;Title\r\n');
  });
  it('keeps Cyrillic text intact', () => {
    expect(buildCsv(columns, [{ id: 2, title: 'Приход' }], ';')).toContain('2;Приход');
  });
});
