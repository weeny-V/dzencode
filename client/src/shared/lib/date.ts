// Date helpers for the UI. Entity dates (order date, guarantee) come from the API as UTC ISO strings and
// are shown in UTC, so server rendering and the browser print the same text. Only the clock in the top menu
// uses the visitor's local time.

const MONTHS = [
  'Янв',
  'Фев',
  'Мар',
  'Апр',
  'Май',
  'Июн',
  'Июл',
  'Авг',
  'Сен',
  'Окт',
  'Ноя',
  'Дек',
] as const;

const WEEKDAYS = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
] as const;

const pad = (value: number): string => String(value).padStart(2, '0');

interface Parts {
  day: number;
  month: number; // 1-12
  year: number;
  weekday: number; // 0 = Sunday
}

const utcParts = (iso: string): Parts => {
  const date = new Date(iso);
  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
    weekday: date.getUTCDay(),
  };
};

const localParts = (date: Date): Parts => ({
  day: date.getDate(),
  month: date.getMonth() + 1,
  year: date.getFullYear(),
  weekday: date.getDay(),
});

const monthName = (month: number): string => MONTHS[month - 1] ?? '';

/** `06 / Апр / 2017` */
export const formatDate = (iso: string): string => {
  const { day, month, year } = utcParts(iso);
  return `${pad(day)} / ${monthName(month)} / ${year}`;
};

/** `04 / 12`: the month number out of 12, shown above the date in the lists. */
export const formatMonthOfYear = (iso: string): string => `${pad(utcParts(iso).month)} / 12`;

/** `06 / 04 / 2017` */
export const formatNumericDate = (iso: string): string => {
  const { day, month, year } = utcParts(iso);
  return `${pad(day)} / ${pad(month)} / ${year}`;
};

/** `Вторник` (local time, for the clock). */
export const formatWeekday = (date: Date): string => WEEKDAYS[localParts(date).weekday] ?? '';

/** `06 Апр, 2017` (local time, for the clock). */
export const formatClockDate = (date: Date): string => {
  const { day, month, year } = localParts(date);
  return `${pad(day)} ${monthName(month)}, ${year}`;
};

/** `17:20` (local time, for the clock). */
export const formatTime = (date: Date): string =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;
