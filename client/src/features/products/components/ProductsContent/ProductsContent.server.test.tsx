import { renderServer } from '@/testing/i18n';
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('ru') }));
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { product } from '@/testing/fixtures';

import { NewProductContent } from '../NewProductContent/NewProductContent.server';
import { ProductsContent } from './ProductsContent.server';

const api = vi.hoisted(() => ({
  getProducts: vi.fn(),
  getProductTypes: vi.fn(),
  getOrderOptions: vi.fn(),
}));
vi.mock('../../api/products', () => api);
vi.mock('@/features/confirmation', () => ({
  DeleteButton: ({ label }: { label: string }) => <button>{label}</button>,
}));
vi.mock('@/shared/ui/RetryButton', () => ({ RetryButton: () => <button>Повторить</button> }));
vi.mock('next/navigation', async () => (await import('@/testing/navigation')).navigationMock);
beforeEach(() => {
  vi.clearAllMocks();
  api.getProductTypes.mockResolvedValue(['Monitors']);
  api.getProducts.mockResolvedValue([product]);
});

describe('server-rendered products', () => {
  it('renders rows and normalizes known type spelling', async () => {
    const html = await renderServer(
      await ProductsContent({ typeParam: 'monitors', query: 'test' }),
    );
    expect(api.getProducts).toHaveBeenCalledWith({ type: 'monitors', query: 'test' });
    expect(html).toContain('Test monitor');
    expect(html).toContain('value="Monitors" selected');
    expect(html).toContain('SN-123');
  });
  it('treats an unknown URL type as all products', async () => {
    await ProductsContent({ typeParam: 'Unknown', query: '' });
    expect(api.getProducts).toHaveBeenLastCalledWith({ type: '', query: '' });
  });
  it('shows list failures alongside the type filter', async () => {
    api.getProducts.mockRejectedValue(new Error('API offline'));
    const html = await renderServer(await ProductsContent({ typeParam: '', query: '' }));
    expect(html).toContain('Не удалось загрузить');
    expect(html).toContain('Monitors');
  });
  it('loads form options and passes the parent context to the form', async () => {
    api.getOrderOptions.mockResolvedValue([{ id: 7, title: 'Order seven' }]);
    const html = await renderServer(await NewProductContent({ orderId: 7 }));
    expect(html).toContain('/orders?order=7');
    expect(html).toContain('Order seven');
  });
  it('shows an error if form options cannot be loaded', async () => {
    api.getOrderOptions.mockRejectedValue(new Error('Orders unavailable'));
    expect(await renderServer(await NewProductContent({}))).toContain('Не удалось загрузить');
  });
});
