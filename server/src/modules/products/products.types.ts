// Shapes follow docs/task-materials/app.js: camelCase fields, `price[]`, nested `guarantee`.
// Dates are Date objects here and ISO strings in JSON.

export interface Price {
  value: number;
  symbol: string;
  isDefault: boolean;
}

export interface Product {
  id: number;
  serialNumber: number;
  isNew: boolean;
  photo: string | null;
  title: string;
  type: string;
  specification: string | null;
  guarantee: { start: Date; end: Date };
  price: Price[];
  /** Id of the order the product belongs to. */
  order: number;
  orderTitle: string;
  date: Date;
}

export interface ProductInput {
  title: string;
  serialNumber: number;
  isNew: boolean;
  photo: string | null;
  /** Product type name, e.g. `Monitors`. */
  type: string;
  specification: string | null;
  guarantee: { start: Date; end: Date };
  price: Price[];
  order: number;
  date: Date;
}

/** A product ready to be stored: the type name is already resolved to an id. */
export type NewProduct = Omit<ProductInput, 'type'> & { typeId: number };

export interface ProductFilter {
  id?: number;
  /** Product type name, e.g. `Monitors`. */
  type?: string;
  orderId?: number;
  /** Search text: found in the title, the `SN-` serial number, the type name or the order title. */
  query?: string;
}

/** What orders need to know about their products. */
export interface OrderProductsSummary {
  productsCount: number;
  /** Sum of the product prices per currency. */
  totals: Price[];
}
