import { describe, expect, it } from 'vitest';

import {
  formatClockDate,
  formatDate,
  formatMonthOfYear,
  formatNumericDate,
  formatTime,
  formatWeekday,
} from './date';

describe('test setup', () => {
  it('runs far from UTC, so that the time zone tests below can fail', () => {
    // 23:30 UTC is already the next day in UTC+14 (see vitest.config.mjs).
    expect(new Date('2017-04-06T23:30:00.000Z').getDate()).toBe(7);
  });
});

describe('entity dates (UTC)', () => {
  it('formats like the design: day / month name / year', () => {
    expect(formatDate('2017-04-06T09:00:00.000Z')).toBe('06 / Апр / 2017');
    expect(formatDate('2017-12-31T23:59:59.000Z')).toBe('31 / Дек / 2017');
  });

  it('handles the edges of the year, the month and a leap day', () => {
    expect(formatDate('2017-01-01T00:00:00.000Z')).toBe('01 / Янв / 2017');
    expect(formatDate('2017-02-28T23:59:59.000Z')).toBe('28 / Фев / 2017');
    expect(formatDate('2020-02-29T12:00:00.000Z')).toBe('29 / Фев / 2020');
    expect(formatDate('2020-03-01T00:00:00.000Z')).toBe('01 / Мар / 2020');
  });

  it('shows the month number out of 12', () => {
    expect(formatMonthOfYear('2017-04-06T09:00:00.000Z')).toBe('04 / 12');
    expect(formatMonthOfYear('2017-11-06T09:00:00.000Z')).toBe('11 / 12');
  });

  it('formats a numeric date for guarantee periods', () => {
    expect(formatNumericDate('2025-08-06T00:00:00.000Z')).toBe('06 / 08 / 2025');
  });

  it('shows the UTC day whatever the time zone of the machine is', () => {
    // 23:30 UTC is the next day in UTC+3 and later, 00:30 UTC is the previous day in UTC-1 and earlier.
    expect(formatDate('2017-04-06T23:30:00.000Z')).toBe('06 / Апр / 2017');
    expect(formatNumericDate('2017-04-06T23:30:00.000Z')).toBe('06 / 04 / 2017');
    expect(formatDate('2017-04-06T00:30:00.000Z')).toBe('06 / Апр / 2017');
    expect(formatMonthOfYear('2017-03-31T23:30:00.000Z')).toBe('03 / 12');
  });
});

describe('clock (local time)', () => {
  const thursday = new Date(2017, 3, 6, 7, 5, 59);

  it('prints the weekday, the date and the time', () => {
    expect(formatWeekday(thursday)).toBe('Четверг');
    expect(formatClockDate(thursday)).toBe('06 Апр, 2017');
    expect(formatTime(thursday)).toBe('07:05');
  });

  it('prints midnight and the last minute of the day', () => {
    expect(formatTime(new Date(2017, 3, 6, 0, 0))).toBe('00:00');
    expect(formatTime(new Date(2017, 3, 6, 23, 59))).toBe('23:59');
  });

  it('uses the local day, not the UTC day', () => {
    // Local noon never changes its day when converted, but local 00:10 is the previous day in UTC+14.
    const earlyMorning = new Date(2017, 3, 6, 0, 10);

    expect(formatClockDate(earlyMorning)).toBe('06 Апр, 2017');
    expect(formatWeekday(earlyMorning)).toBe('Четверг');
  });

  it('starts the week on Sunday like Date does', () => {
    expect(formatWeekday(new Date(2017, 3, 2))).toBe('Воскресенье');
  });
});
