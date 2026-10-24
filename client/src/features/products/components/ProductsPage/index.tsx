import './ProductsPage.scss';

import { ViewTransition } from 'react';

import type { Product } from '@/shared/api/types';
import { toQuery } from '@/shared/lib/searchParams';
import { LoadError } from '@/shared/ui/LoadError';
import { NoResults } from '@/shared/ui/NoResults';
import { PageHeader } from '@/shared/ui/PageHeader';
import { ListSkeleton } from '@/shared/ui/Skeleton';

import { ProductRow } from '../ProductRow';
import { TypeFilter } from '../TypeFilter';

interface ProductsPageProps {
  /** The rows to show; `undefined` until the first load has finished. */
  products?: readonly Product[];
  /** A newer table is being loaded: the rows on screen are the previous ones and look dimmed. */
  refreshing: boolean;
  /** Why the table could not be loaded, if it could not. */
  error?: string;
  onRetry: () => void;
  /** Type names for the filter; `undefined` until they are loaded. */
  types?: readonly string[];
  /** The type names could not be loaded: the filter offers to try again. */
  typesFailed: boolean;
  onRetryTypes: () => void;
  /** The type filter currently applied; empty means all. */
  selectedType: string;
  /** The search text (`/products?q=...`). */
  query: string;
}

/** The table area: placeholder rows, the error, the empty message or the rows. */
function ProductsTable({
  products,
  refreshing,
  error,
  onRetry,
  selectedType,
  query,
}: Pick<
  ProductsPageProps,
  'products' | 'refreshing' | 'error' | 'onRetry' | 'selectedType' | 'query'
>) {
  if (error !== undefined) {
    return <LoadError title="Не удалось загрузить продукты." message={error} onRetry={onRetry} />;
  }
  if (products === undefined) {
    return <ListSkeleton rows={8} rowHeight="3.6rem" label="Загрузка продуктов…" />;
  }
  if (products.length === 0) {
    if (query) {
      return (
        <NoResults
          query={query}
          clearHref={`/products${toQuery({ type: selectedType || undefined })}`}
        />
      );
    }
    return (
      <p className="products-page__empty">
        {selectedType ? 'Продуктов такого типа нет.' : 'Продуктов пока нет.'}
      </p>
    );
  }

  // The table scrolls sideways on narrow screens, like in the design.
  return (
    <div className="products-page__scroll">
      <ul
        className={`products-page__list${refreshing ? ' products-page__list--refreshing' : ''}`}
        aria-busy={refreshing}
      >
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
  );
}

/** The products page: title with the count, the type filter and the table. */
export function ProductsPage({
  products,
  refreshing,
  error,
  onRetry,
  types,
  typesFailed,
  onRetryTypes,
  selectedType,
  query,
}: ProductsPageProps) {
  return (
    <>
      <PageHeader title="Продукты" count={products?.length}>
        <TypeFilter
          types={types}
          failed={typesFailed}
          onRetry={onRetryTypes}
          selected={selectedType}
        />
      </PageHeader>

      <ProductsTable
        products={products}
        refreshing={refreshing}
        error={error}
        onRetry={onRetry}
        selectedType={selectedType}
        query={query}
      />
    </>
  );
}
