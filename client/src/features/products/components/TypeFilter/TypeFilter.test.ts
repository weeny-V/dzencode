import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { TypeFilter } from './index';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/products',
  useSearchParams: () => new URLSearchParams(),
}));

const render = (props: Partial<Parameters<typeof TypeFilter>[0]>) =>
  renderToStaticMarkup(createElement(TypeFilter, { selected: '', ...props }));

describe('TypeFilter', () => {
  it('is disabled without a retry while the names load', () => {
    const html = render({});

    expect(html).toContain('disabled');
    expect(html).not.toContain('type-filter__retry');
  });

  it('offers to try again when the names could not be loaded', () => {
    const html = render({ failed: true, onRetry: vi.fn() });

    expect(html).toContain('disabled');
    expect(html).toContain('type-filter__retry');
    expect(html).toContain('Повторить');
  });

  it('enables the select with the names and no retry once they are loaded', () => {
    const html = render({ types: ['Keyboards', 'Monitors'], failed: true });

    expect(html).not.toContain('disabled');
    expect(html).not.toContain('type-filter__retry');
    expect(html).toContain('Monitors');
  });
});
