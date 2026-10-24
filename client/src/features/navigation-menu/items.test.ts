import { describe, expect, it } from 'vitest';

import { isActivePath, isSearchablePath, NAV_ITEMS, navDirection } from './items';

describe('isActivePath', () => {
  it('matches the page and its sub-pages', () => {
    expect(isActivePath('/orders', '/orders')).toBe(true);
    expect(isActivePath('/orders/2', '/orders')).toBe(true);
  });

  it('matches a trailing slash', () => {
    expect(isActivePath('/orders/', '/orders')).toBe(true);
  });

  it('does not match a different page that starts with the same letters', () => {
    expect(isActivePath('/orders-archive', '/orders')).toBe(false);
    expect(isActivePath('/products', '/orders')).toBe(false);
    expect(isActivePath('/', '/orders')).toBe(false);
  });
});

describe('isSearchablePath', () => {
  it('is true on the pages with a list to search in', () => {
    expect(isSearchablePath('/orders')).toBe(true);
    expect(isSearchablePath('/products')).toBe(true);
    expect(isSearchablePath('/orders/')).toBe(true);
  });

  it('is false on their forms: there is no list to search there', () => {
    expect(isSearchablePath('/orders/new')).toBe(false);
    expect(isSearchablePath('/products/new')).toBe(false);
  });

  it('is false on every other page', () => {
    expect(isSearchablePath('/groups')).toBe(false);
    expect(isSearchablePath('/settings')).toBe(false);
    expect(isSearchablePath('/')).toBe(false);
    expect(isSearchablePath('/orders-archive')).toBe(false);
  });
});

describe('navDirection', () => {
  it('goes forward down the sidebar and back up', () => {
    expect(navDirection('/orders', '/products')).toBe('nav-forward');
    expect(navDirection('/orders', '/settings')).toBe('nav-forward');
    expect(navDirection('/products', '/orders')).toBe('nav-back');
    expect(navDirection('/settings', '/groups')).toBe('nav-back');
  });

  it('uses the page the visitor is on, also when it is a sub-page of an item', () => {
    expect(navDirection('/orders/2', '/products')).toBe('nav-forward');
  });

  it('treats a page outside the sidebar as the start of the list', () => {
    expect(navDirection('/', '/orders')).toBe('nav-forward');
    expect(navDirection('/nope', '/settings')).toBe('nav-forward');
  });

  it('goes back for the current page itself', () => {
    expect(navDirection('/products', '/products')).toBe('nav-back');
  });
});

describe('NAV_ITEMS', () => {
  it('lists the five sections of the design with unique addresses', () => {
    expect(NAV_ITEMS).toHaveLength(5);
    expect(new Set(NAV_ITEMS.map((item) => item.href)).size).toBe(5);
    expect(NAV_ITEMS.map((item) => item.href)).toEqual(
      expect.arrayContaining(['/orders', '/products']),
    );
  });
});
