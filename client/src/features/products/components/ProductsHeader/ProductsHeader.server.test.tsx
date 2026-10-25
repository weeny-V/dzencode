import { beforeEach, describe, expect, it, vi } from 'vitest';

import { product } from '@/testing/fixtures';
import { renderServer } from '@/testing/i18n';

import { ProductsHeader } from './ProductsHeader.server';

vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('ru') }));
const api = vi.hoisted(() => ({ getProducts: vi.fn(), getProductTypes: vi.fn() }));
vi.mock('../../api/products', () => api);
vi.mock('../ExportProducts/ExportProducts.server', () => ({
  ExportProductsControl: () => <button>Экспорт CSV</button>,
}));
vi.mock('next/navigation', async () => (await import('@/testing/navigation')).navigationMock);
beforeEach(() => {
  vi.clearAllMocks();
  api.getProductTypes.mockResolvedValue(['Monitors']);
  api.getProducts.mockResolvedValue([product, product]);
});

const render = (params: Record<string, string> = {}) =>
  renderServer(<ProductsHeader searchParams={Promise.resolve(params)} />);

describe('products title row', () => {
  it('holds the title, the streamed count, the type filter and the export button', async () => {
    const html = await render({ type: 'monitors', q: 'test' });
    expect(html).toContain('<h1');
    expect(html).toContain('Продукты');
    expect(html).toContain('<span class="page-header__count"> / 2</span>');
    expect(html).toContain('value="Monitors" selected');
    expect(html).toContain('Экспорт CSV');
    expect(api.getProducts).toHaveBeenCalledWith({ type: 'monitors', query: 'test' });
  });
  it('keeps the title and drops the count when the list cannot be read', async () => {
    api.getProducts.mockRejectedValue(new Error('offline'));
    const html = await render();
    expect(html).toContain('Продукты');
    expect(html).not.toContain('page-header__count');
  });
  it('shows no filter and no export when the type names cannot be read', async () => {
    api.getProductTypes.mockRejectedValue(new Error('offline'));
    const html = await render();
    expect(html).toContain('Продукты');
    expect(html).not.toContain('Экспорт CSV');
    expect(html).not.toContain('<select');
  });
  it('counts all products for an unknown type, as the list shows them', async () => {
    await render({ type: 'Unknown' });
    expect(api.getProducts).toHaveBeenLastCalledWith({ type: '', query: '' });
  });
});
