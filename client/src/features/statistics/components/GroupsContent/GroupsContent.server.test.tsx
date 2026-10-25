import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderServer } from '@/testing/i18n';

import { GroupsContent } from './GroupsContent.server';
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('ru') }));
vi.mock('@/shared/api/session.server', async () => {
  const { testSession } = await import('@/testing/auth');
  return { requireSession: vi.fn(() => Promise.resolve(testSession)) };
});

const api = vi.hoisted(() => ({ getInventoryStatistics: vi.fn() }));
vi.mock('../../api/statistics', () => api);
vi.mock('../InventoryChart', () => ({ InventoryChart: () => <div>Deferred chart</div> }));
vi.mock('@/shared/ui/RetryButton', () => ({ RetryButton: () => <button>Retry</button> }));
beforeEach(() => vi.clearAllMocks());

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
    expect(html.match(/<table>/g)).toHaveLength(2);
    expect(html).toContain('Без цены в выбранной валюте');
    expect(html).toContain('/groups?currency=UAH&amp;q=monitor');
    expect(html).toContain('aria-current="page"');
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
