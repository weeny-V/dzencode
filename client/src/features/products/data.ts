import type { Product } from '@/shared/api/types';
import { matchesQuery, serialLabel } from '@/shared/lib/search';
import { mockProducts, mockProductTypes } from '@/shared/mocks/inventory';

// Stage 2 reads static data. In stage 3 these functions call the API (`GET /products?type=&q=`,
// `GET /product-types`) and keep their signatures, so the components do not change.

export const listProductTypes = (): readonly string[] => mockProductTypes;

/** Products of a type (when given) that match the search: by title, serial number, type or order title. */
export const listProducts = (type?: string, query = ''): Product[] =>
  mockProducts.filter(
    (product) =>
      (!type || product.type === type) &&
      matchesQuery(
        query,
        product.title,
        serialLabel(product.serialNumber),
        product.type,
        product.orderTitle,
      ),
  );
