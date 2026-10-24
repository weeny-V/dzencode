import { describe, expect, it } from 'vitest';

import { hrefAfterOrderDeleted } from './afterDelete';

describe('hrefAfterOrderDeleted', () => {
  it('closes the panel of the deleted order, keeping the search', () => {
    expect(hrefAfterOrderDeleted(2, { selectedId: 2, query: 'mon' })).toBe('/orders?q=mon');
    expect(hrefAfterOrderDeleted(2, { selectedId: 2, query: '' })).toBe('/orders');
  });

  it('leaves the visitor alone when another order is open now', () => {
    expect(hrefAfterOrderDeleted(2, { selectedId: 3, query: '' })).toBeUndefined();
  });

  it('leaves the visitor alone when no panel is open', () => {
    expect(hrefAfterOrderDeleted(2, { selectedId: undefined, query: 'mon' })).toBeUndefined();
  });
});
