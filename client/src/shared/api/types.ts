import type { Price } from '@/shared/lib/money';

// The shapes of the API responses (see docs/API.md). Dates are UTC ISO strings.

/** An item of `GET /products`. */
export interface Product {
  id: number;
  serialNumber: number;
  isNew: boolean;
  photo: string | null;
  title: string;
  /** Product type name, e.g. `Monitors`. */
  type: string;
  specification: string | null;
  guarantee: { start: string; end: string };
  price: Price[];
  /** Id of the order the product belongs to. */
  order: number;
  orderTitle: string;
  date: string;
}

/** An item of `GET /product-types`. */
export interface ProductType {
  id: number;
  name: string;
}

/** An item of `GET /orders`. */
export interface OrderSummary {
  id: number;
  title: string;
  description: string | null;
  date: string;
  productsCount: number;
  /** Sum of the product prices per currency. */
  totals: Price[];
}

/** The response of `GET /orders/:id`. */
export interface OrderDetails {
  id: number;
  title: string;
  description: string | null;
  date: string;
  products: Product[];
}

/** The body of `POST /orders`. A missing `date` means "now". */
export interface NewOrder {
  title: string;
  description: string | null;
  /** ISO 8601, e.g. `2017-06-29`. */
  date?: string;
}

/** The body of `POST /products`. The type is given by name, the order by id. */
export interface NewProduct {
  title: string;
  serialNumber: number;
  isNew: boolean;
  photo: string | null;
  type: string;
  specification: string | null;
  guarantee: { start: string; end: string };
  price: Price[];
  order: number;
}
