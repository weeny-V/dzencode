import type { OrderSummary, Product } from '@/shared/api/types';

export const order: OrderSummary = {
  id: 7,
  title: 'Test order',
  description: null,
  warehouseId: null,
  date: '2026-10-25T10:00:00Z',
  productsCount: 1,
  totals: [{ value: 20, symbol: 'USD', isDefault: false }],
};
export const product: Product = {
  id: 9,
  title: 'Test monitor',
  serialNumber: 123,
  isNew: true,
  photo: null,
  type: 'Monitors',
  specification: null,
  guarantee: { start: '2026-10-01T00:00:00Z', end: '2027-10-01T00:00:00Z' },
  price: [{ value: 20, symbol: 'USD', isDefault: false }],
  order: 7,
  orderTitle: 'Test order',
  date: order.date,
};

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}
