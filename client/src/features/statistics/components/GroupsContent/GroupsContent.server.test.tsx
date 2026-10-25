import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderServer } from '@/testing/i18n';

import { GroupsContent } from './GroupsContent.server';
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('ru') }));
vi.mock('@/shared/api/session.server', async () => {
  const { testSession } = await import('@/testing/auth');
  return { requireSession: vi.fn(() => Promise.resolve(testSession)) };
});

const api = vi.hoisted(() => ({ getInventoryStatistics: vi.fn(), getInventoryGraph: vi.fn() }));
vi.mock('../../api/statistics', () => api);
vi.mock('../InventoryChart', () => ({ InventoryChart: () => <div>Deferred chart</div> }));
vi.mock('../InventoryGraph', () => ({ InventoryGraph: () => <div>Deferred graph</div> }));
vi.mock('@/shared/ui/RetryButton', () => ({ RetryButton: () => <button>Retry</button> }));
const graph = {
  ordersTotal: 3,
  ordersShown: 1,
  nodes: [
    { id: 'warehouse:none', kind: 'WAREHOUSE', label: null, productsCount: 3 },
    { id: 'order:1', kind: 'ORDER', label: 'Order A', productsCount: 3 },
    { id: 'type:Monitors', kind: 'PRODUCT_TYPE', label: 'Monitors', productsCount: 3 },
  ],
  edges: [
    { id: 'a', source: 'warehouse:none', target: 'order:1', productsCount: 3 },
    { id: 'b', source: 'order:1', target: 'type:Monitors', productsCount: 3 },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  api.getInventoryGraph.mockResolvedValue(graph);
});

describe('server inventory report', () => {
  it('renders exact values and missing-price coverage independently of canvas', async () => {
    api.getInventoryStatistics.mockResolvedValue({
      currency: 'USD',
      ordersCount: 2,
      productsCount: 3,
      value: 50.25,
      missingPrices: 1,
      byType: [{ type: 'Monitors', productsCount: 3 }],
      byWarehouse: [
        { warehouseId: null, name: null, value: 50.25, productsCount: 3, missingPrices: 1 },
      ],
    });
    const html = await renderServer(
      await GroupsContent({ searchParams: Promise.resolve({ currency: 'USD', q: 'monitor' }) }),
    );
    expect(api.getInventoryStatistics).toHaveBeenCalledWith('USD');
    expect(html).toContain('50,25');
    expect(html).toContain('Не назначен');
    expect(html.match(/<table>/g)).toHaveLength(3);
    expect(html).toContain('Deferred graph');
    expect(html).toContain('Order A');
    expect(html).toContain('Monitors × 3');
    expect(html).toContain('Показаны приходы с наибольшим числом продуктов');
    expect(html).toContain('Без цены в выбранной валюте');
    expect(html).toContain('/groups?currency=UAH&amp;q=monitor');
    expect(html).toContain('aria-current="page"');
  });
  it('keeps the report when only the graph fails', async () => {
    api.getInventoryStatistics.mockResolvedValue({
      currency: 'UAH',
      ordersCount: 0,
      productsCount: 0,
      value: 0,
      missingPrices: 0,
      byType: [],
      byWarehouse: [],
    });
    api.getInventoryGraph.mockRejectedValue(new Error('Offline'));
    const html = await renderServer(await GroupsContent({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('Не удалось загрузить граф связей.');
    expect(html).not.toContain('Deferred graph');
    expect(html.match(/<table>/g)).toHaveLength(2);
  });
  it('shows an empty state instead of an empty graph', async () => {
    api.getInventoryStatistics.mockResolvedValue({
      currency: 'UAH',
      ordersCount: 0,
      productsCount: 0,
      value: 0,
      missingPrices: 0,
      byType: [],
      byWarehouse: [],
    });
    api.getInventoryGraph.mockResolvedValue({
      ordersTotal: 0,
      ordersShown: 0,
      nodes: [],
      edges: [],
    });
    const html = await renderServer(await GroupsContent({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('Пока нет приходов для построения связей.');
    expect(html).not.toContain('Deferred graph');
  });
  it('renders a local recoverable API error', async () => {
    api.getInventoryStatistics.mockRejectedValue(new Error('Offline'));
    const html = await renderServer(
      await GroupsContent({ searchParams: Promise.resolve({ currency: ['USD', 'UAH'] }) }),
    );
    expect(api.getInventoryStatistics).toHaveBeenCalledWith('UAH');
    expect(html).toContain('Не удалось загрузить статистику.');
    expect(html).toContain('Retry');
  });
});
