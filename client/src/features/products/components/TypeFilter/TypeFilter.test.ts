import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderToStaticMarkup } from '@/testing/i18n';

import { TypeFilter } from './index';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/products',
  useSearchParams: () => new URLSearchParams(),
}));

const render = (selected = '', types: readonly string[] = ['Keyboards', 'Monitors']) =>
  renderToStaticMarkup(createElement(TypeFilter, { selected, types }));

describe('TypeFilter', () => {
  it('renders all server-provided options', () => {
    const html = render();
    expect(html).toContain('Keyboards');
    expect(html).toContain('Monitors');
    expect(html).not.toContain('disabled');
  });
  it('marks the type selected by the server', () => {
    expect(render('Monitors')).toContain('value="Monitors" selected');
  });
  it('still offers all products when the dictionary is empty', () => {
    expect(render('', [])).toContain('value="" selected');
    expect(render('', [])).toContain('Все');
  });
});
