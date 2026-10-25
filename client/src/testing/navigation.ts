import { vi } from 'vitest';

/** Register next/navigation with vi.mock in each test, returning this shared state. */
export const navigation = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  pathname: '/orders',
  search: '',
};

export const navigationMock = {
  unstable_rethrow: (error: unknown) => {
    if (
      error instanceof Error &&
      'digest' in error &&
      typeof error.digest === 'string' &&
      error.digest.startsWith('NEXT_')
    )
      throw error;
  },
  useRouter: () => navigation,
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
};
