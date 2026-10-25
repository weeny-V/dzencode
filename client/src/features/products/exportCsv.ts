import type { Product } from '@/shared/api/types';
import type { Locale } from '@/shared/i18n/config';
import { buildCsv, csvDelimiter, formatCsvNumber } from '@/shared/lib/csv';

export interface ProductsCsvHeaders {
  id: string;
  title: string;
  serialNumber: string;
  type: string;
  isNew: string;
  guaranteeStart: string;
  guaranteeEnd: string;
  priceUah: string;
  priceUsd: string;
  orderId: string;
  order: string;
  specification: string;
  yes: string;
  no: string;
}

/** The payload of the worker: everything it needs is plain data, so it can be copied into the worker. */
export interface ProductsCsvPayload {
  locale: Locale;
  headers: ProductsCsvHeaders;
  products: Product[];
}

/** One row per product; dates are the UTC calendar date (`2017-06-29`), amounts follow the locale's decimal mark. */
export const buildProductsCsv = ({ locale, headers, products }: ProductsCsvPayload): string => {
  const price = (product: Product, code: string) => {
    const found = product.price.find((item) => item.symbol === code);
    return found ? formatCsvNumber(found.value, locale) : '';
  };
  return buildCsv<Product>(
    [
      { header: headers.id, value: (product) => product.id },
      { header: headers.title, value: (product) => product.title },
      { header: headers.serialNumber, value: (product) => product.serialNumber },
      { header: headers.type, value: (product) => product.type },
      { header: headers.isNew, value: (product) => (product.isNew ? headers.yes : headers.no) },
      { header: headers.guaranteeStart, value: (product) => product.guarantee.start.slice(0, 10) },
      { header: headers.guaranteeEnd, value: (product) => product.guarantee.end.slice(0, 10) },
      { header: headers.priceUah, value: (product) => price(product, 'UAH') },
      { header: headers.priceUsd, value: (product) => price(product, 'USD') },
      { header: headers.orderId, value: (product) => product.order },
      { header: headers.order, value: (product) => product.orderTitle },
      { header: headers.specification, value: (product) => product.specification },
    ],
    products,
    csvDelimiter(locale),
  );
};
