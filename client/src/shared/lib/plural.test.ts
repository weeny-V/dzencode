import { describe, expect, it } from 'vitest';

import { pluralize } from './plural';

const forms = ['продукт', 'продукта', 'продуктов'] as const;

describe('pluralize', () => {
  it.each([
    [0, 'продуктов'],
    [1, 'продукт'],
    [2, 'продукта'],
    [4, 'продукта'],
    [5, 'продуктов'],
    [11, 'продуктов'],
    [12, 'продуктов'],
    [14, 'продуктов'],
    [21, 'продукт'],
    [22, 'продукта'],
    [25, 'продуктов'],
    [101, 'продукт'],
    [111, 'продуктов'],
    [112, 'продуктов'],
  ])('%i -> %s', (count, expected) => {
    expect(pluralize(count, forms)).toBe(expected);
  });
});
