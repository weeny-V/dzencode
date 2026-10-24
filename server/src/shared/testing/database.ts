// Helpers for integration tests that run against the real `<DB_NAME>_test` MySQL database.
// Start it first: `npm run db:up` (see README). Not part of the production build.
import type { RowDataPacket } from 'mysql2/promise';

import { createApp } from '../../app.js';
import { loadConfig } from '../../config.js';
import { createPool, type Pool } from './../db/pool.js';

/** An app wired to the test database; call `pool.end()` in `afterAll`. */
export const createTestContext = () => {
  const { db, clientOrigin } = loadConfig();
  const pool = createPool({ ...db, database: `${db.database}_test` });
  return { pool, app: createApp({ clientOrigin, pool }) };
};

interface CountRow extends RowDataPacket {
  total: number;
}

export const count = async (pool: Pool, table: string): Promise<number> => {
  const [rows] = await pool.query<CountRow[]>(`SELECT COUNT(*) AS total FROM ${table}`);
  return rows[0]?.total ?? 0;
};

/**
 * Replaces all data with a small fixed set (explicit ids keep the expectations readable):
 *
 * - types: 1 Monitors, 2 Laptops
 * - orders: 1 "Order A" (products 1, 2), 2 "Order B" (product 3), 3 "Empty order"
 * - products: 1 Monitor 1, 2 Laptop 1, 3 Monitor 2; each has a USD price and a default UAH price
 */
export const resetData = async (pool: Pool) => {
  // Children are deleted before parents.
  for (const table of ['product_prices', 'products', 'orders', 'product_types']) {
    await pool.query(`DELETE FROM ${table}`);
  }
  await pool.query('INSERT INTO product_types (id, name) VALUES ?', [
    [
      [1, 'Monitors'],
      [2, 'Laptops'],
    ],
  ]);
  await pool.query('INSERT INTO orders (id, title, description, date) VALUES ?', [
    [
      [1, 'Order A', 'first', '2020-01-01 10:00:00'],
      [2, 'Order B', null, '2020-02-01 10:00:00'],
      [3, 'Empty order', null, '2020-03-01 10:00:00'],
    ],
  ]);
  await pool.query(
    `INSERT INTO products
       (id, serial_number, is_new, photo, title, type_id, specification,
        guarantee_start, guarantee_end, order_id, date)
     VALUES ?`,
    [
      [
        [
          1,
          111,
          true,
          null,
          'Monitor 1',
          1,
          'spec',
          '2020-01-01 00:00:00',
          '2021-01-01 00:00:00',
          1,
          '2020-01-02 00:00:00',
        ],
        [
          2,
          222,
          false,
          'a.jpg',
          'Laptop 1',
          2,
          null,
          '2020-01-01 00:00:00',
          '2022-01-01 00:00:00',
          1,
          '2020-01-03 00:00:00',
        ],
        [
          3,
          333,
          true,
          null,
          'Monitor 2',
          1,
          null,
          '2020-02-01 00:00:00',
          '2021-02-01 00:00:00',
          2,
          '2020-02-02 00:00:00',
        ],
      ],
    ],
  );
  await pool.query(
    'INSERT INTO product_prices (product_id, `value`, symbol, is_default) VALUES ?',
    [
      [
        [1, 100, 'USD', false],
        [1, 2600, 'UAH', true],
        [2, 1000, 'USD', false],
        [2, 26000, 'UAH', true],
        [3, 50, 'USD', false],
        [3, 1300, 'UAH', true],
      ],
    ],
  );
};
