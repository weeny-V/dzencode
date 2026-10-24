export interface NavItem {
  label: string;
  href: string;
  /** The search field in the top menu works on this page. */
  searchable?: boolean;
}

/**
 * The sidebar items as in the design. Orders and Products are real pages; the rest open a
 * "coming soon" page, so every link works and highlights like the others.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Приход', href: '/orders', searchable: true },
  { label: 'Группы', href: '/groups' },
  { label: 'Продукты', href: '/products', searchable: true },
  { label: 'Пользователи', href: '/users' },
  { label: 'Настройки', href: '/settings' },
];

/** `/orders` is active on `/orders` and on `/orders/...`, but not on `/orders-archive`. */
export const isActivePath = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

/** The search field is enabled only on pages that have something to search in. */
export const isSearchablePath = (pathname: string): boolean =>
  NAV_ITEMS.some((item) => item.searchable && isActivePath(pathname, item.href));

/** Names of the view-transition types that `shared/styles/_transitions.scss` animates. */
export type NavDirection = 'nav-forward' | 'nav-back';

/**
 * Going down the sidebar slides the new page in from the right, going up from the left, like turning a page.
 * From a page that is not in the sidebar (e.g. `/`) every move counts as forward.
 */
export const navDirection = (currentPath: string, targetHref: string): NavDirection => {
  const current = NAV_ITEMS.findIndex((item) => isActivePath(currentPath, item.href));
  const target = NAV_ITEMS.findIndex((item) => item.href === targetHref);
  return target > current ? 'nav-forward' : 'nav-back';
};
