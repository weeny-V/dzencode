import type { OrderSummary } from '@/shared/api/types';
import type { Locale } from '@/shared/i18n/config';
import { buildCsv, csvDelimiter, formatCsvNumber } from '@/shared/lib/csv';

/** What the export action reads: the orders of the current search and the warehouse names for their column. */
export interface OrdersExportData {
  orders: OrderSummary[];
  warehouses: { id: number; name: string }[];
}

export interface OrdersCsvHeaders {
  id: string;
  title: string;
  description: string;
  date: string;
  warehouse: string;
  products: string;
  totalUah: string;
  totalUsd: string;
}

/** The payload of the worker: everything it needs is plain data, so it can be copied into the worker. */
export interface OrdersCsvPayload {
  locale: Locale;
  headers: OrdersCsvHeaders;
  data: OrdersExportData;
}

/** One row per order; dates are the UTC calendar date (`2017-06-29`), amounts follow the locale's decimal mark. */
export const buildOrdersCsv = ({ locale, headers, data }: OrdersCsvPayload): string => {
  const warehouses = new Map(data.warehouses.map(({ id, name }) => [id, name]));
  const total = (order: OrderSummary, code: string) => {
    const price = order.totals.find((item) => item.symbol === code);
    return price ? formatCsvNumber(price.value, locale) : '';
  };
  return buildCsv<OrderSummary>(
    [
      { header: headers.id, value: (order) => order.id },
      { header: headers.title, value: (order) => order.title },
      { header: headers.description, value: (order) => order.description },
      { header: headers.date, value: (order) => order.date.slice(0, 10) },
      {
        header: headers.warehouse,
        value: (order) => (order.warehouseId === null ? '' : warehouses.get(order.warehouseId)),
      },
      { header: headers.products, value: (order) => order.productsCount },
      { header: headers.totalUah, value: (order) => total(order, 'UAH') },
      { header: headers.totalUsd, value: (order) => total(order, 'USD') },
    ],
    data.orders,
    csvDelimiter(locale),
  );
};
