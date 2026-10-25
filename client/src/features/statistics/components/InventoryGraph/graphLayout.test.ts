import { describe, expect, it } from 'vitest';

import { COLUMN_GAP, columnPositions, ROW_GAP } from './graphLayout';

describe('graph column layout', () => {
  it('places each kind in its own column, centered vertically', () => {
    const positions = columnPositions([
      { id: 'w1', kind: 'WAREHOUSE' },
      { id: 'w2', kind: 'WAREHOUSE' },
      { id: 'o1', kind: 'ORDER' },
      { id: 't1', kind: 'PRODUCT_TYPE' },
      { id: 't2', kind: 'PRODUCT_TYPE' },
      { id: 't3', kind: 'PRODUCT_TYPE' },
    ]);
    expect(positions.get('w1')).toEqual({ x: 0, y: -ROW_GAP / 2 });
    expect(positions.get('w2')).toEqual({ x: 0, y: ROW_GAP / 2 });
    expect(positions.get('o1')).toEqual({ x: COLUMN_GAP, y: 0 });
    expect(positions.get('t1')).toEqual({ x: 2 * COLUMN_GAP, y: -ROW_GAP });
    expect(positions.get('t3')).toEqual({ x: 2 * COLUMN_GAP, y: ROW_GAP });
  });
  it('handles an empty graph', () => {
    expect(columnPositions([]).size).toBe(0);
  });
});
