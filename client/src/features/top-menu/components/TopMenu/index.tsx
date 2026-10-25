'use client';

import './TopMenu.scss';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ReactNode, Suspense } from 'react';

import { LocaleSwitcher } from '@/features/locale';
import { SessionsCounter } from '@/features/sessions';
import { formatClockDate, formatTime, formatWeekday } from '@/shared/lib/date';
import { ClockIcon, MenuIcon, ShieldLogo } from '@/shared/ui/icons';

import { SearchField, SearchFieldPlaceholder } from '../SearchField';
import { useClock } from './useClock';

interface TopMenuProps {
  /** Whether the sidebar drawer is open (small screens only). */
  menuOpen: boolean;
  /** Id of the sidebar element that the menu button controls. */
  navigationId: string;
  onMenuToggle: () => void;
  /** The search works on the current page (it has a list to filter). */
  searchEnabled: boolean;
  authControls?: ReactNode;
}

/** The top bar: logo, search and the live date and time. */
export function TopMenu({
  menuOpen,
  navigationId,
  onMenuToggle,
  searchEnabled,
  authControls,
}: TopMenuProps) {
  const t = useTranslations('TopMenu');
  const calendar = useTranslations('Calendar');
  const names = { months: calendar('months'), weekdays: calendar('weekdays') };
  const now = useClock();
  const pathname = usePathname();

  return (
    <header className="top-menu">
      <button
        type="button"
        className="top-menu__burger"
        onClick={onMenuToggle}
        aria-label={t('menu')}
        aria-expanded={menuOpen}
        aria-controls={navigationId}
      >
        <MenuIcon />
      </button>

      <Link href="/orders" className="top-menu__brand">
        <ShieldLogo className="top-menu__logo" />
        <span className="top-menu__brand-name">Inventory</span>
      </Link>

      <div className="top-menu__search">
        {/* `useSearchParams` inside needs a Suspense boundary, otherwise static pages fail to build. */}
        <Suspense fallback={<SearchFieldPlaceholder />}>
          <SearchField key={pathname} enabled={searchEnabled} />
        </Suspense>
      </div>

      <LocaleSwitcher />
      {authControls}
      <div className="top-menu__sessions">
        <SessionsCounter />
      </div>

      <div className="top-menu__clock">
        <div className="top-menu__date">
          <span className="top-menu__weekday">{now ? formatWeekday(now, names) : <>&nbsp;</>}</span>
          <span className="top-menu__day">{now ? formatClockDate(now, names) : <>&nbsp;</>}</span>
        </div>
        <ClockIcon className="top-menu__clock-icon" />
        <time className="top-menu__time" dateTime={now ? now.toISOString() : undefined}>
          {now ? formatTime(now) : <>&nbsp;</>}
        </time>
      </div>
    </header>
  );
}
