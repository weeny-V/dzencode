'use client';

import { type ReactNode, useEffect, useRef } from 'react';

// The panel stands next to the list from this width up (keep in sync with `$bp-wide` in _tokens.scss).
const SIDE_BY_SIDE_QUERY = '(min-width: 1200px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

interface PanelScrollProps {
  /** The panel scrolls into view again when another order is opened. */
  orderId: number;
  className?: string;
  children: ReactNode;
}

/**
 * On narrow screens the panel opens under the list, possibly below the fold: bring it into view.
 * Next to the list (wide screens) it is already visible, so nothing scrolls.
 */
export function PanelScroll({ orderId, className, children }: PanelScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia(SIDE_BY_SIDE_QUERY).matches) return;
    const reduceMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    ref.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, [orderId]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
