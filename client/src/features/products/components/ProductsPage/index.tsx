import './ProductsPage.scss';

import { ViewTransition } from 'react';

import type { Product } from '@/shared/api/types';
import { toQuery } from '@/shared/lib/searchParams';
import { NoResults } from '@/shared/ui/NoResults';
import { PageHeader } from '@/shared/ui/PageHeader';

import { ProductRow } from '../ProductRow';
import { TypeFilter } from '../TypeFilter';

interface ProductsPageProps {
  products: readonly Product[];
  types: readonly string[];
  /** The type filter currently applied; empty means all. */
  selectedType: string;
  /** The search text (`/products?q=...`). */
  query: string;
}

/** The products page: title with the count, the type filter and the table. */
export function ProductsPage({ products, types, selectedType, query }: ProductsPageProps) {
  return (
    <>
      <PageHeader title="Продукты" count={products.length}>
        <TypeFilter types={types} selected={selectedType} />
      </PageHeader>

      {products.length === 0 ? (
        query ? (
          <NoResults
            query={query}
            clearHref={`/products${toQuery({ type: selectedType || undefined })}`}
          />
        ) : (
          <p className="products-page__empty">Продуктов такого типа нет.</p>
        )
      ) : (
        // The table scrolls sideways on narrow screens, like in the design.
        <div className="products-page__scroll">
          <ul className="products-page__list">
            {products.map((product, index) => (
              // The name lets the browser slide the remaining rows into place when a filter or the search
              // removes some of them; rows that appear get the CSS entrance of `.product-row` instead.
              <ViewTransition
                key={product.id}
                name={`product-${product.id}`}
                enter="none"
                exit="auto"
                share="row-move"
                update="row-move"
              >
                <ProductRow product={product} index={index} />
              </ViewTransition>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
