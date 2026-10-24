import './ItemSummary.scss';

import type { ReactNode } from 'react';

interface ItemSummaryProps {
  icon: ReactNode;
  title: string;
  /** A short line under the title: "3 продукта", a serial number. */
  meta: string;
}

/** A round icon with a title and a small line under it: what a confirmation window is about. */
export function ItemSummary({ icon, title, meta }: ItemSummaryProps) {
  return (
    <div className="item-summary">
      <span className="item-summary__icon">{icon}</span>
      <div className="item-summary__text">
        <span className="item-summary__title">{title}</span>
        <span className="item-summary__meta">{meta}</span>
      </div>
    </div>
  );
}
