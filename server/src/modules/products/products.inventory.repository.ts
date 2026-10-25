import type { RowDataPacket } from 'mysql2/promise';

import type { ReadDatabase } from '../../shared/db/pool.js';
import type { InventoryCurrency, InventoryGroup } from './products.types.js';

export const createProductsInventoryRepository = (database: ReadDatabase) => ({
  /** One selected price per product, enforced by uq_product_prices_product_symbol. */
  async inventoryGroups(currency: InventoryCurrency): Promise<InventoryGroup[]> {
    const [rows] = await database.query<(RowDataPacket & InventoryGroup)[]>(
      `SELECT p.order_id AS orderId, t.name AS type, COUNT(*) AS productsCount,
              COALESCE(SUM(pr.\`value\`), 0) AS value,
              SUM(pr.product_id IS NULL) AS missingPrices
         FROM products p
         JOIN product_types t ON t.id = p.type_id
         LEFT JOIN product_prices pr ON pr.product_id = p.id AND pr.symbol = ?
        GROUP BY p.order_id, t.id, t.name ORDER BY p.order_id, t.id`,
      [currency],
    );
    return rows.map((row) => ({ ...row, missingPrices: Number(row.missingPrices) }));
  },
});
