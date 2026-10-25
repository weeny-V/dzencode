import './DateStack.scss';

import { dictionary } from '@/shared/lib/calendar/messages.server';
import { formatDate, formatMonthOfYear } from '@/shared/lib/date';

/** A date as in the lists: the month number out of 12 small on top, `06 / Апр / 2017` below. */
export async function DateStack({ iso }: { iso: string }) {
  const { messages } = await dictionary();
  const names = { months: String(messages.months), weekdays: String(messages.weekdays) };
  return (
    <time className="date-stack" dateTime={iso}>
      <span className="date-stack__month">{formatMonthOfYear(iso)}</span>
      <span className="date-stack__date">{formatDate(iso, names)}</span>
    </time>
  );
}
