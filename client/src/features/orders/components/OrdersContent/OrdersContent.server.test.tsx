import { renderServer } from '@/testing/i18n';
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('ru') }));
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { order, product } from '@/testing/fixtures';

import { OrderPanel } from '../OrderPanel/OrderPanel.server';
import { OrdersContent } from './OrdersContent.server';

const api = vi.hoisted(() => ({ getOrders: vi.fn(), getOrder: vi.fn() }));
vi.mock('../../api/orders', () => api);
vi.mock('@/features/confirmation', () => ({
  DeleteButton: ({ label }: { label: string }) => <button>{label}</button>,
}));
vi.mock('@/shared/ui/RetryButton', () => ({ RetryButton: () => <button>Повторить</button> }));
beforeEach(() => vi.clearAllMocks());

describe('server-rendered orders', () => {
  it('renders inventory values and navigation in HTML without client data loading', async () => {
    api.getOrders.mockResolvedValue([order]);
    const html = await renderServer(await OrdersContent({ query: 'monitor' }));
    expect(api.getOrders).toHaveBeenCalledWith('monitor');
    expect(html).toContain('Test order');
    expect(html).toContain('/orders?order=7&amp;q=monitor');
    expect(html).toContain('Удалить приход Test order');
    expect(html).toContain('data-pending-target');
  });
  it('renders errors locally with a retry', async () => {
    api.getOrders.mockRejectedValue(new Error('API unavailable'));
    const html = await renderServer(await OrdersContent({ query: '' }));
    expect(html).toContain('Не удалось загрузить приходы.');
    expect(html).toContain('Повторить');
  });
  it('keeps the selected panel in the empty-search reset link', async () => {
    api.getOrders.mockResolvedValue([]);
    const html = await renderServer(await OrdersContent({ query: 'absent' }));
    expect(html).toContain('absent');
    expect(html).toContain('href="/orders"');
  });
  it('renders panel products and the add link on the server', async () => {
    api.getOrder.mockResolvedValue({ ...order, products: [product] });
    const html = await renderServer(await OrderPanel({ id: 7, closeHref: '/orders?q=monitor' }));
    expect(html).toContain('Test monitor');
    expect(html).toContain('SN-123');
    expect(html).toContain('/products/new?order=7');
    expect(html).toContain('/orders?q=monitor');
  });
  it('renders a missing panel as a retryable local error', async () => {
    api.getOrder.mockRejectedValue(new Error('Order not found'));
    expect(await renderServer(await OrderPanel({ id: 7, closeHref: '/orders' }))).toContain(
      'Не удалось загрузить приход.',
    );
  });
});
