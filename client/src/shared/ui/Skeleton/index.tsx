import './Skeleton.scss';

import type { CSSProperties } from 'react';

interface SkeletonProps {
  /** Any CSS length: `40%`, `6rem`. */
  width?: string;
  height?: string;
}

/** A grey bar that stands in for text that is still loading. Decorative: screen readers skip it. */
export function Skeleton({ width = '100%', height = '1em' }: SkeletonProps) {
  return (
    <span
      className="skeleton"
      aria-hidden="true"
      style={{ '--skeleton-width': width, '--skeleton-height': height } as CSSProperties}
    />
  );
}

interface ListSkeletonProps {
  /** How many placeholder rows to draw. */
  rows: number;
  /** Height of a row, like the real rows have. */
  rowHeight: string;
  /** Announced to screen readers instead of the bars: "Загрузка приходов…". */
  label: string;
}

/** Placeholder rows shown while a list loads for the first time. */
export function ListSkeleton({ rows, rowHeight, label }: ListSkeletonProps) {
  return (
    <div role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      <ul className="list-skeleton" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <li
            key={index}
            className="list-skeleton__row"
            style={{ '--i': index, minHeight: rowHeight } as CSSProperties}
          >
            <Skeleton width="28%" height="1.1rem" />
            <Skeleton width="12%" height="0.9rem" />
            <Skeleton width="16%" height="0.9rem" />
          </li>
        ))}
      </ul>
    </div>
  );
}
