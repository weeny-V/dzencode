'use client';

import './AppShell.scss';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useState } from 'react';

import { ApiStatus } from '@/features/api-status';
import { isSearchablePath, NavigationMenu } from '@/features/navigation-menu';
import { TopMenu } from '@/features/top-menu';

// The sidebar is a fixed column from this width up (keep in sync with `$bp-desktop` in _tokens.scss).
const DESKTOP_QUERY = '(min-width: 992px)';
const NAVIGATION_ID = 'main-navigation';

/** The frame of every page: top bar, sidebar and the content area. Owns the sidebar drawer state. */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations('AppShell');
  const pathname = usePathname();
  // The drawer is open for the page it was opened on, so any navigation (a link, the browser's Back button)
  // closes it without an effect that resets state.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const menuOpen = openOn === pathname;

  const closeMenu = () => setOpenOn(null);

  useEffect(() => {
    if (!menuOpen) return;

    // Keyboard users land in the drawer and get back to the button when it closes.
    document.getElementById(NAVIGATION_ID)?.querySelector<HTMLElement>('.nav-menu__link')?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpenOn(null);
      document.querySelector<HTMLElement>(`[aria-controls="${NAVIGATION_ID}"]`)?.focus();
    };
    // On a wide screen the sidebar is always visible: forget the drawer, so shrinking the window does not reopen it.
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpenOn(null);
    };

    document.addEventListener('keydown', closeOnEscape);
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <a className="visually-hidden-focusable app-shell__skip" href="#content">
        {t('skip')}
      </a>
      <TopMenu
        menuOpen={menuOpen}
        navigationId={NAVIGATION_ID}
        onMenuToggle={() => setOpenOn(menuOpen ? null : pathname)}
        searchEnabled={isSearchablePath(pathname)}
      />
      <NavigationMenu
        id={NAVIGATION_ID}
        open={menuOpen}
        onNavigate={closeMenu}
        footer={<ApiStatus />}
      />
      {menuOpen && <div className="app-shell__scrim" onClick={closeMenu} aria-hidden="true" />}
      <main id="content" className="app-shell__content">
        {children}
      </main>
    </div>
  );
}
