import './ProductsContent.scss';

import { ViewTransition } from 'react';

import { loadOrError } from '@/shared/api/server';
import type { Product } from '@/shared/api/types';
import type { ActionResult } from '@/shared/lib/actionResult';
import { toQuery } from '@/shared/lib/searchParams';
import { LoadError } from '@/shared/ui/LoadError';
import { NoResults } from '@/shared/ui/NoResults';
import { PageHeader } from '@/shared/ui/PageHeader';

import { getProducts, getProductTypes } from '../../api/products';
import { parseType } from '../../searchParams';
import { ProductRow } from '../ProductRow';
import { TypeFilter } from '../TypeFilter';

export async function ProductsContent({ typeParam, query }: { typeParam: string; query: string }) {
  const [types, initialProducts] = await Promise.all([
    loadOrError(getProductTypes),
    loadOrError(() => getProducts({ type: typeParam, query })),
  ]);
  const selectedType = types.ok ? parseType(typeParam, types.data) : '';
  // Unknown types mean all products. Known names can reuse the case-insensitive API result.
  const products =
    types.ok && typeParam && !selectedType
      ? await loadOrError(() => getProducts({ type: '', query }))
      : initialProducts;
  return (
    <ProductsContentView
      types={types}
      products={products}
      selectedType={selectedType}
      query={query}
    />
  );
}

function ProductsContentView({
  types,
  products,
  selectedType,
  query,
}: {
  types: ActionResult<string[]>;
  products: ActionResult<Product[]>;
  selectedType: string;
  query: string;
}) {
  if (!types.ok)
    return (
      <>
        <PageHeader title="Продукты" />
        <LoadError title="Не удалось загрузить типы продуктов." message={types.error} />
      </>
    );
  return (
    <>
      <PageHeader title="Продукты" count={products.ok ? products.data.length : undefined}>
        <TypeFilter types={types.data} selected={selectedType} />
      </PageHeader>
      <div data-pending-target>
        {!products.ok ? (
          <LoadError title="Не удалось загрузить продукты." message={products.error} />
        ) : products.data.length === 0 ? (
          query ? (
            <NoResults query={query} clearHref={`/products${toQuery({ type: selectedType })}`} />
          ) : (
            <p className="products-page__empty">
              {selectedType ? 'Продуктов такого типа нет.' : 'Продуктов пока нет.'}
            </p>
          )
        ) : (
          <div className="products-page__scroll">
            <ul className="products-page__list">
              {products.data.map((product, index) => (
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
      </div>
    </>
  );
}
