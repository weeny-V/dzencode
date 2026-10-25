import './PageHeader.scss';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { PlusIcon } from '../icons';

interface PageHeaderProps {
  title: string;
  /** The number after the title: `Приходы / 25`. */
  count?: number;
  /**
   * The same, but streamed in by the page (a Suspense boundary around a `page-header__count` element): the title
   * is then painted at once and stays the same element when the number arrives.
   */
  countSlot?: ReactNode;
  /** Extra controls next to the title, e.g. filters. */
  children?: ReactNode;
  /** The round green "+" button: its label (for screen readers and the tooltip) and the page it opens. */
  add?: { label: string; href: string };
}

/** Title row of a page: the round "+" button, `Title / count` and optional controls. */
export function PageHeader({ title, count, countSlot, children, add }: PageHeaderProps) {
  return (
    <header className="page-header">
      {add && (
        <Link href={add.href} className="page-header__add" aria-label={add.label} title={add.label}>
          <PlusIcon />
        </Link>
      )}
      <h1 className="page-header__title">
        {title}
        {count !== undefined && <span className="page-header__count"> / {count}</span>}
        {countSlot}
      </h1>
      {children && <div className="page-header__controls">{children}</div>}
    </header>
  );
}
