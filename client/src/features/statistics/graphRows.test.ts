import { describe, expect, it } from 'vitest';

import type { InventoryGraph } from '@/shared/api/types';

import { connectionRows } from './graphRows';

const graph: InventoryGraph = {
  ordersTotal: 3,
  ordersShown: 2,
  nodes: [
    { id: 'warehouse:1', kind: 'WAREHOUSE', label: 'Kyiv', productsCount: 2 },
    { id: 'warehouse:none', kind: 'WAREHOUSE', label: null, productsCount: 0 },
    { id: 'order:1', kind: 'ORDER', label: 'Order A', productsCount: 2 },
    { id: 'order:3', kind: 'ORDER', label: 'Empty', productsCount: 0 },
    { id: 'type:Monitors', kind: 'PRODUCT_TYPE', label: 'Monitors', productsCount: 1 },
    { id: 'type:Laptops', kind: 'PRODUCT_TYPE', label: 'Laptops', productsCount: 1 },
  ],
  edges: [
    { id: 'a', source: 'warehouse:1', target: 'order:1', productsCount: 2 },
    { id: 'b', source: 'order:1', target: 'type:Monitors', productsCount: 1 },
    { id: 'c', source: 'order:1', target: 'type:Laptops', productsCount: 1 },
    { id: 'd', source: 'warehouse:none', target: 'order:3', productsCount: 0 },
  ],
};

describe('graph connection rows', () => {
  it('lists each order with its warehouse and product types', () => {
    expect(connectionRows(graph, 'Unassigned')).toEqual([
      {
        orderId: 'order:1',
        order: 'Order A',
        warehouse: 'Kyiv',
        productsCount: 2,
        types: [
          { type: 'Monitors', productsCount: 1 },
          { type: 'Laptops', productsCount: 1 },
        ],
      },
      {
        orderId: 'order:3',
        order: 'Empty',
        warehouse: 'Unassigned',
        productsCount: 0,
        types: [],
      },
    ]);
  });
  it('returns nothing for an empty graph', () => {
    expect(connectionRows({ ...graph, nodes: [], edges: [] }, 'Unassigned')).toEqual([]);
  });
});
