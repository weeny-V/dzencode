import './ProductsContent.scss';

import { ViewTransition } from 'react';

import type { Product } from '@/shared/api/types';
import type { Text } from '@/shared/i18n/server';
import type { ActionResult } from '@/shared/lib/actionResult';
import { toQuery } from '@/shared/lib/searchParams';
import { LoadError } from '@/shared/ui/LoadError';
import { NoResults } from '@/shared/ui/NoResults';
import { text as noResultsText } from '@/shared/ui/NoResults/messages.server';

import { ProductRow } from '../ProductRow';
import { loadProductsView } from './loadProducts.server';
import { text } from './messages.server';

export async function ProductsContent({ typeParam, query }: { typeParam: string; query: string }) {
  const { types, products, selectedType } = await loadProductsView(typeParam, query);
  return (
    <ProductsContentView
      t={await text()}
      noResults={await noResultsText()}
      types={types}
      products={products}
      selectedType={selectedType}
      query={query}
    />
  );
}

function ProductsContentView({
  t,
  types,
  products,
  selectedType,
  query,
  noResults,
}: {
  t: Text;
  noResults: Text;
  types: ActionResult<string[]>;
  products: ActionResult<Product[]>;
  selectedType: string;
  query: string;
}) {
  if (!types.ok) return <LoadError title={t('typesFailed')} />;
  return (
    <>
      <div data-pending-target>
        {!products.ok ? (
          <LoadError title={t('failed')} />
        ) : products.data.length === 0 ? (
          query ? (
            <NoResults
              t={noResults}
              query={query}
              clearHref={`/products${toQuery({ type: selectedType })}`}
            />
          ) : (
            <p className="products-page__empty">{selectedType ? t('emptyType') : t('empty')}</p>
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
