import type { OrderDetails, Product } from '@/shared/api/types';

// Static data of stage 2 (layout), shared by the orders and products features so that they cannot drift apart.
// Stage 3 replaces it with requests to the API (the shapes are the same) and this file is deleted.

export const mockProductTypes: readonly string[] = [
  'Keyboards',
  'Laptops',
  'Monitors',
  'Smartphones',
];

export const mockOrders: readonly Omit<OrderDetails, 'products'>[] = [
  {
    id: 1,
    title: 'Длинное предлинное длиннючее название прихода',
    description: null,
    date: '2017-04-06T09:00:00.000Z',
  },
  { id: 2, title: 'Длинное название прихода', description: null, date: '2017-09-06T09:00:00.000Z' },
  {
    id: 3,
    title: 'Длинное предлинное название прихода',
    description: null,
    date: '2017-06-06T09:00:00.000Z',
  },
  { id: 4, title: 'Короткий приход', description: null, date: '2017-02-06T09:00:00.000Z' },
];

const product = (
  id: number,
  order: number,
  title: string,
  type: string,
  overrides: Partial<Product> = {},
): Product => ({
  id,
  serialNumber: 12_345_670 + id,
  isNew: true,
  photo: null,
  title,
  type,
  specification: null,
  guarantee: { start: '2017-04-06T00:00:00.000Z', end: '2025-08-06T00:00:00.000Z' },
  price: [
    { value: 2500, symbol: 'USD', isDefault: false },
    { value: 250_000.5, symbol: 'UAH', isDefault: true },
  ],
  order,
  // One source of truth: the title of the order the product belongs to.
  orderTitle: mockOrders.find((item) => item.id === order)?.title ?? '',
  date: '2017-09-06T09:00:00.000Z',
  ...overrides,
});

export const mockProducts: readonly Product[] = [
  product(1, 1, 'Gigabyte Technology X58-USB3 (Socket 1366) 6 X58-USB3', 'Monitors'),
  product(2, 1, 'Dell UltraSharp U2723QE 27" 4K USB-C', 'Monitors', {
    isNew: false,
    price: [
      { value: 650, symbol: 'USD', isDefault: false },
      { value: 16_900, symbol: 'UAH', isDefault: true },
    ],
  }),
  product(3, 1, 'Lenovo ThinkPad T14 Gen 3 (21AH00BKRT)', 'Laptops', {
    guarantee: { start: '2017-07-01T00:00:00.000Z', end: '2019-07-01T00:00:00.000Z' },
    price: [
      { value: 1200, symbol: 'USD', isDefault: false },
      { value: 31_200, symbol: 'UAH', isDefault: true },
    ],
  }),
  product(4, 2, 'Keychron K2 Wireless Mechanical Keyboard', 'Keyboards', {
    isNew: false,
    price: [
      { value: 90, symbol: 'USD', isDefault: false },
      { value: 2340, symbol: 'UAH', isDefault: true },
    ],
  }),
  product(5, 2, 'LG UltraWide 34WN80C-B 34" IPS', 'Monitors', {
    price: [
      { value: 650, symbol: 'USD', isDefault: false },
      { value: 16_900, symbol: 'UAH', isDefault: true },
    ],
  }),
  product(6, 3, 'Apple iPhone 13 128GB', 'Smartphones', {
    isNew: false,
    price: [
      { value: 450, symbol: 'USD', isDefault: false },
      { value: 11_700, symbol: 'UAH', isDefault: true },
    ],
  }),
  product(7, 3, 'MacBook Air 13" M2 8/256', 'Laptops', {
    price: [
      { value: 900, symbol: 'USD', isDefault: false },
      { value: 23_400, symbol: 'UAH', isDefault: true },
    ],
  }),
  product(8, 3, 'Logitech MX Keys Wireless Keyboard', 'Keyboards', {
    price: [{ value: 50.25, symbol: 'UAH', isDefault: true }],
  }),
  product(9, 4, 'Samsung Galaxy S23 256GB', 'Smartphones', {
    price: [
      { value: 2500.85, symbol: 'USD', isDefault: false },
      { value: 50.25, symbol: 'UAH', isDefault: true },
    ],
  }),
];
