import './ProductsContent.scss';

import { NextIntlClientProvider } from 'next-intl';
import { ViewTransition } from 'react';

import { loadOrError } from '@/shared/api/server';
import type { Product } from '@/shared/api/types';
import type { Text } from '@/shared/i18n/server';
import type { ActionResult } from '@/shared/lib/actionResult';
import { toQuery } from '@/shared/lib/searchParams';
import { LoadError } from '@/shared/ui/LoadError';
import { NoResults } from '@/shared/ui/NoResults';
import { text as noResultsText } from '@/shared/ui/NoResults/messages.server';
import { PageHeader } from '@/shared/ui/PageHeader';

import { getProducts, getProductTypes } from '../../api/products';
import { parseType } from '../../searchParams';
import { ProductRow } from '../ProductRow';
import { TypeFilter } from '../TypeFilter';
import { dictionary as filterDictionary } from '../TypeFilter/messages.server';
import { text } from './messages.server';

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
      t={await text()}
      noResults={await noResultsText()}
      filter={await filterDictionary()}
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
  filter,
}: {
  t: Text;
  noResults: Text;
  filter: Awaited<ReturnType<typeof filterDictionary>>;
  types: ActionResult<string[]>;
  products: ActionResult<Product[]>;
  selectedType: string;
  query: string;
}) {
  if (!types.ok)
    return (
      <>
        <PageHeader title={t('title')} />
        <LoadError title={t('typesFailed')} />
      </>
    );
  return (
    <>
      <PageHeader title={t('title')} count={products.ok ? products.data.length : undefined}>
        <NextIntlClientProvider locale={filter.locale} messages={{ TypeFilter: filter.messages }}>
          <TypeFilter types={types.data} selected={selectedType} />
        </NextIntlClientProvider>
      </PageHeader>
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
