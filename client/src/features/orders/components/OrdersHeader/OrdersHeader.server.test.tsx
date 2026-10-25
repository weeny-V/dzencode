import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderServer } from '@/testing/i18n';

import { OrdersHeader } from './OrdersHeader.server';

vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('ru') }));
const api = vi.hoisted(() => ({ getOrders: vi.fn() }));
vi.mock('../../api/orders', () => api);
vi.mock('../ExportOrders/ExportOrders.server', () => ({
  ExportOrdersControl: () => <button>Экспорт CSV</button>,
}));
beforeEach(() => {
  vi.clearAllMocks();
  api.getOrders.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
});

const render = (params: Record<string, string> = {}) =>
  renderServer(<OrdersHeader searchParams={Promise.resolve(params)} />);

describe('orders title row', () => {
  it('holds the title, the add link, the streamed count and the export button', async () => {
    const html = await render({ q: ' monitor ' });
    expect(html).toContain('Приходы');
    expect(html).toContain('href="/orders/new"');
    expect(html).toContain('<span class="page-header__count"> / 3</span>');
    expect(html).toContain('Экспорт CSV');
    expect(api.getOrders).toHaveBeenCalledWith('monitor');
  });
  it('keeps the title and the add link, without a count, when the list cannot be read', async () => {
    api.getOrders.mockRejectedValue(new Error('offline'));
    const html = await render();
    expect(html).toContain('Приходы');
    expect(html).toContain('href="/orders/new"');
    expect(html).not.toContain('page-header__count');
  });
});
