import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { asForeignKeyViolation } from '../../shared/db/errors.js';
import { containsPattern } from '../../shared/db/like.js';
import type { Pool } from '../../shared/db/pool.js';
import { withTransaction } from '../../shared/db/transaction.js';
import type {
  NewProduct,
  OrderProductsSummary,
  Price,
  Product,
  ProductFilter,
} from './products.types.js';

/** Name of the foreign key from products to orders (see db/changelog/001-schema.yaml). */
export const ORDER_FOREIGN_KEY = 'fk_products_order';

interface ProductRow extends RowDataPacket {
  id: number;
  serialNumber: number;
  isNew: number;
  photo: string | null;
  title: string;
  type: string;
  specification: string | null;
  guaranteeStart: Date;
  guaranteeEnd: Date;
  orderId: number;
  orderTitle: string;
  date: Date;
}

interface PriceRow extends RowDataPacket {
  productId: number;
  value: number;
  symbol: string;
  isDefault: number;
}

interface CountRow extends RowDataPacket {
  orderId: number;
  productsCount: number;
}

interface TotalRow extends RowDataPacket {
  orderId: number;
  symbol: string;
  value: number;
  isDefault: number;
}

/** The serial number as the lists print it (`SN-123`), so a visitor can search for what they see. */
const SERIAL_LABEL_SQL = "CONCAT('SN-', p.serial_number)";

interface OrderIdRow extends RowDataPacket {
  orderId: number;
}

export const createProductsRepository = (pool: Pool) => ({
  async list(filter: ProductFilter = {}): Promise<Product[]> {
    // Only fixed fragments are concatenated; every value goes through a `?` placeholder.
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    if (filter.id !== undefined) {
      conditions.push('p.id = ?');
      params.push(filter.id);
    }
    if (filter.type !== undefined) {
      conditions.push('t.name = ?');
      params.push(filter.type);
    }
    if (filter.orderId !== undefined) {
      conditions.push('p.order_id = ?');
      params.push(filter.orderId);
    }
    if (filter.query !== undefined) {
      conditions.push(
        `(p.title LIKE ? OR ${SERIAL_LABEL_SQL} LIKE ? OR t.name LIKE ? OR o.title LIKE ?)`,
      );
      const pattern = containsPattern(filter.query);
      params.push(pattern, pattern, pattern, pattern);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [products] = await pool.query<ProductRow[]>(
      `SELECT p.id, p.serial_number AS serialNumber, p.is_new AS isNew, p.photo, p.title,
              t.name AS type, p.specification,
              p.guarantee_start AS guaranteeStart, p.guarantee_end AS guaranteeEnd,
              p.order_id AS orderId, o.title AS orderTitle, p.date
         FROM products p
         JOIN product_types t ON t.id = p.type_id
         JOIN orders o ON o.id = p.order_id
         ${where}
        ORDER BY p.id`,
      params,
    );
    if (products.length === 0) return [];

    const [prices] = await pool.query<PriceRow[]>(
      `SELECT product_id AS productId, \`value\`, symbol, is_default AS isDefault
         FROM product_prices
        WHERE product_id IN (?)
        ORDER BY id`,
      [products.map((product) => product.id)],
    );
    const pricesByProduct = new Map<number, Price[]>();
    for (const { productId, value, symbol, isDefault } of prices) {
      const list = pricesByProduct.get(productId) ?? [];
      list.push({ value, symbol, isDefault: Boolean(isDefault) });
      pricesByProduct.set(productId, list);
    }

    return products.map((row) => ({
      id: row.id,
      serialNumber: row.serialNumber,
      isNew: Boolean(row.isNew),
      photo: row.photo,
      title: row.title,
      type: row.type,
      specification: row.specification,
      guarantee: { start: row.guaranteeStart, end: row.guaranteeEnd },
      price: pricesByProduct.get(row.id) ?? [],
      order: row.orderId,
      orderTitle: row.orderTitle,
      date: row.date,
    }));
  },

  /** Stores the product and its prices in one transaction and returns the new id. */
  async create(input: NewProduct): Promise<number> {
    try {
      return await withTransaction(pool, async (connection) => {
        const [result] = await connection.query<ResultSetHeader>(
          `INSERT INTO products
             (serial_number, is_new, photo, title, type_id, specification,
              guarantee_start, guarantee_end, order_id, date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            input.serialNumber,
            input.isNew,
            input.photo,
            input.title,
            input.typeId,
            input.specification,
            input.guarantee.start,
            input.guarantee.end,
            input.order,
            input.date,
          ],
        );

        await connection.query(
          'INSERT INTO product_prices (product_id, `value`, symbol, is_default) VALUES ?',
          [
            input.price.map(({ value, symbol, isDefault }) => [
              result.insertId,
              value,
              symbol,
              isDefault,
            ]),
          ],
        );
        return result.insertId;
      });
    } catch (error) {
      throw asForeignKeyViolation(error) ?? error;
    }
  },

  /** Ids of the orders that have a product whose title or serial number contains the text. */
  async findOrderIdsByQuery(query: string): Promise<number[]> {
    const pattern = containsPattern(query);
    const [rows] = await pool.query<OrderIdRow[]>(
      `SELECT DISTINCT p.order_id AS orderId
         FROM products p
        WHERE p.title LIKE ? OR ${SERIAL_LABEL_SQL} LIKE ?`,
      [pattern, pattern],
    );
    return rows.map((row) => row.orderId);
  },

  /** Product count and price totals per order, for the orders list. */
  async summarizeByOrder(): Promise<Map<number, OrderProductsSummary>> {
    const [counts] = await pool.query<CountRow[]>(
      'SELECT order_id AS orderId, COUNT(*) AS productsCount FROM products GROUP BY order_id',
    );
    const [totals] = await pool.query<TotalRow[]>(
      `SELECT p.order_id AS orderId, pr.symbol, SUM(pr.\`value\`) AS \`value\`,
              MAX(pr.is_default) AS isDefault
         FROM products p
         JOIN product_prices pr ON pr.product_id = p.id
        GROUP BY p.order_id, pr.symbol
        ORDER BY pr.symbol`,
    );

    const summaries = new Map<number, OrderProductsSummary>();
    for (const { orderId, productsCount } of counts) {
      summaries.set(orderId, { productsCount, totals: [] });
    }
    for (const { orderId, symbol, value, isDefault } of totals) {
      summaries.get(orderId)?.totals.push({ value, symbol, isDefault: Boolean(isDefault) });
    }
    return summaries;
  },
});

export type ProductsRepository = ReturnType<typeof createProductsRepository>;
