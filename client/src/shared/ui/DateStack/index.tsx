import './DateStack.scss';

import { formatDate, formatMonthOfYear } from '@/shared/lib/date';

/** A date as in the lists: the month number out of 12 small on top, `06 / Апр / 2017` below. */
export function DateStack({ iso }: { iso: string }) {
  return (
    <time className="date-stack" dateTime={iso}>
      <span className="date-stack__month">{formatMonthOfYear(iso)}</span>
      <span className="date-stack__date">{formatDate(iso)}</span>
    </time>
  );
}
