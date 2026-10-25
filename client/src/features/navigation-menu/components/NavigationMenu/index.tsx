'use client';

import './NavigationMenu.scss';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ReactNode, ViewTransition } from 'react';

import { GearIcon } from '@/shared/ui/icons';

import { isActivePath, NAV_ITEMS, navDirection } from '../../items';

interface NavigationMenuProps {
  /** Element id, so that the menu button can point at it with aria-controls. */
  id: string;
  /** Whether the drawer is open (small screens; on wide screens the sidebar is always visible). */
  open: boolean;
  /** Called after a link is chosen, so the drawer can close. */
  onNavigate: () => void;
  /** Something small pinned to the bottom of the sidebar, e.g. a status indicator. */
  footer?: ReactNode;
}

/** The sidebar: avatar and links to the pages. */
export function NavigationMenu({ id, open, onNavigate, footer }: NavigationMenuProps) {
  const t = useTranslations('NavigationMenu');
  const pathname = usePathname();

  return (
    <nav id={id} className={`nav-menu${open ? ' nav-menu--open' : ''}`} aria-label={t('label')}>
      <div className="nav-menu__profile">
        <div className="nav-menu__avatar" aria-hidden="true">
          <svg viewBox="0 0 96 96" focusable="false">
            <circle cx="48" cy="38" r="17" />
            <path d="M14 90c2-20 17-30 34-30s32 10 34 30z" />
          </svg>
        </div>
        {/* A shortcut to the same page as the "Настройки" item below: hidden from keyboard and screen readers to avoid a duplicate link. */}
        <Link
          href="/settings"
          className="nav-menu__settings"
          transitionTypes={[navDirection(pathname, '/settings')]}
          tabIndex={-1}
          aria-hidden="true"
          onClick={onNavigate}
        >
          <GearIcon />
        </Link>
      </div>

      <ul className="nav-menu__list">
        {NAV_ITEMS.map(({ label, href }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href} className="nav-menu__item">
              <Link
                href={href}
                className={`nav-menu__link${active ? ' nav-menu__link--active' : ''}`}
                aria-current={active ? 'page' : undefined}
                // The page slides in the direction of the move (see navDirection and _transitions.scss).
                transitionTypes={[navDirection(pathname, href)]}
                onClick={onNavigate}
              >
                {t(label)}
                {active && (
                  // One underline for the whole menu: it has the same name on every item, so the browser
                  // glides it from the old item to the new one instead of drawing a new one.
                  <ViewTransition name="nav-indicator" share="nav-indicator-move" default="none">
                    <span className="nav-menu__indicator" />
                  </ViewTransition>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {footer && <div className="nav-menu__footer">{footer}</div>}
    </nav>
  );
}
