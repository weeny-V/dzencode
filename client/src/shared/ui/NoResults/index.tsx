import './NoResults.scss';

import Link from 'next/link';

import type { Text } from '@/shared/i18n/server';

interface NoResultsProps {
  /** What was searched for, shown back to the visitor. */
  query: string;
  t: Text;
  /** Where "reset the search" leads: the same page without `q`. */
  clearHref: string;
}

/** The message under a list that the search emptied. `role="status"` makes screen readers announce it. */
export function NoResults({ query, clearHref, t }: NoResultsProps) {
  return (
    <p className="no-results" role="status">
      {t('empty', { query })}{' '}
      <Link href={clearHref} className="no-results__reset">
        {t('reset')}
      </Link>
    </p>
  );
}
