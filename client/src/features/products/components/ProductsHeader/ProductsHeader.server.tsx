import { NextIntlClientProvider } from 'next-intl';
import { Suspense } from 'react';

import { parseSearch, type SearchParams } from '@/shared/lib/searchParams';
import { PageHeader } from '@/shared/ui/PageHeader';

import { parseTypeParam } from '../../searchParams';
import { ExportProductsControl } from '../ExportProducts/ExportProducts.server';
import { loadProductsView } from '../ProductsContent/loadProducts.server';
import { text } from '../ProductsContent/messages.server';
import { TypeFilter } from '../TypeFilter';
import { dictionary as filterDictionary } from '../TypeFilter/messages.server';

const readAddress = async (searchParams: SearchParams) => {
  const params = await searchParams;
  return { typeParam: parseTypeParam(params.type), query: parseSearch(params.q) };
};

/** The number of products found, streamed into the title once the list has been read (the read is shared). */
async function ProductsCount({ searchParams }: { searchParams: SearchParams }) {
  const { typeParam, query } = await readAddress(searchParams);
  const { products } = await loadProductsView(typeParam, query);
  return products.ok ? <span className="page-header__count"> / {products.data.length}</span> : null;
}

/** The type filter and the export button; without the type names there is nothing to filter by. */
async function ProductsControls({ searchParams }: { searchParams: SearchParams }) {
  const { typeParam, query } = await readAddress(searchParams);
  const { types, selectedType } = await loadProductsView(typeParam, query);
  if (!types.ok) return null;
  const filter = await filterDictionary();
  return (
    <>
      <NextIntlClientProvider locale={filter.locale} messages={{ TypeFilter: filter.messages }}>
        <TypeFilter types={types.data} selected={selectedType} />
      </NextIntlClientProvider>
      <ExportProductsControl />
    </>
  );
}

/**
 * The title row of the products page. It sits outside the list's Suspense boundary, so the title is painted with
 * the first chunk of HTML and does not change when the list arrives; the count and the controls stream in.
 */
export async function ProductsHeader({ searchParams }: { searchParams: SearchParams }) {
  const t = await text();
  return (
    <PageHeader
      title={t('title')}
      countSlot={
        <Suspense fallback={null}>
          <ProductsCount searchParams={searchParams} />
        </Suspense>
      }
    >
      <Suspense fallback={null}>
        <ProductsControls searchParams={searchParams} />
      </Suspense>
    </PageHeader>
  );
}
