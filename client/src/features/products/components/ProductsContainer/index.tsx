'use client';

import type { Product } from '@/shared/api/types';
import { useDialogTarget } from '@/shared/hooks/useDialogTarget';

import { ProductsPage } from '../ProductsPage';
import { useProducts } from './useProducts';

interface ProductsContainerProps {
  /** The type from the address (`?type=`), not checked against the known names yet. */
  typeParam: string;
  /** The search text (`?q=`). */
  query: string;
}

/** Takes the products from the store (the hook keeps them in step with the address) and hands them to the page. */
export function ProductsContainer({ typeParam, query }: ProductsContainerProps) {
  const { products, refreshing, error, retry, types, typesFailed, retryTypes, selectedType } =
    useProducts(typeParam, query);

  const deletion = useDialogTarget<Product>();

  return (
    <ProductsPage
      products={products}
      refreshing={refreshing}
      error={error}
      onRetry={retry}
      types={types}
      typesFailed={typesFailed}
      onRetryTypes={retryTypes}
      selectedType={selectedType}
      deletion={deletion}
      query={query}
    />
  );
}
