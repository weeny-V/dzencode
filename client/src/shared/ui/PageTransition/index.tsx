import { type ReactNode, ViewTransition } from 'react';

/**
 * Animates a page in when it is navigated to and out when it is left (see shared/styles/_transitions.scss).
 * A sidebar link tags its navigation with a direction (`nav-forward` or `nav-back`, see `navDirection` in
 * features/navigation-menu) and the page slides that way; without a tag (browser Back, an ordinary link)
 * it fades. Wrap the content of each `page.tsx` in it, not the layout: layouts persist between pages.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'page-enter' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'page-exit' }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
