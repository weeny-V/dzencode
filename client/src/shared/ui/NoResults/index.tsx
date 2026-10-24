import './NoResults.scss';

import Link from 'next/link';

interface NoResultsProps {
  /** What was searched for, shown back to the visitor. */
  query: string;
  /** Where "reset the search" leads: the same page without `q`. */
  clearHref: string;
}

/** The message under a list that the search emptied. `role="status"` makes screen readers announce it. */
export function NoResults({ query, clearHref }: NoResultsProps) {
  return (
    <p className="no-results" role="status">
      Ничего не найдено по запросу «{query}».{' '}
      <Link href={clearHref} className="no-results__reset">
        Сбросить поиск
      </Link>
    </p>
  );
}
