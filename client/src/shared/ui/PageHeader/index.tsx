import './PageHeader.scss';

import type { ReactNode } from 'react';

import { PlusIcon } from '../icons';

interface PageHeaderProps {
  title: string;
  /** The number after the title: `Приходы / 25`. */
  count?: number;
  /** Extra controls next to the title, e.g. filters. */
  children?: ReactNode;
  /** Label for the round green button. Without `addLabel` the button is not shown. */
  addLabel?: string;
}

/** Title row of a page: the round "+" button, `Title / count` and optional controls. */
export function PageHeader({ title, count, children, addLabel }: PageHeaderProps) {
  return (
    <header className="page-header">
      {addLabel && (
        // Adding is built in stage 5, so the button is only drawn for now.
        <button
          type="button"
          className="page-header__add"
          disabled
          aria-label={`${addLabel} (скоро)`}
          title={`${addLabel}: скоро`}
        >
          <PlusIcon />
        </button>
      )}
      <h1 className="page-header__title">
        {title}
        {count !== undefined && <span className="page-header__count"> / {count}</span>}
      </h1>
      {children && <div className="page-header__controls">{children}</div>}
    </header>
  );
}
