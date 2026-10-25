import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { asForeignKeyViolation } from '../../shared/db/errors.js';
import { containsPattern } from '../../shared/db/like.js';
import type { Pool } from '../../shared/db/pool.js';
import type { Order, OrderInput } from './orders.types.js';

interface OrderRow extends RowDataPacket, Order {}

const toOrder = ({ id, title, description, date, warehouseId }: OrderRow): Order => ({
  id,
  title,
  description,
  date,
  warehouseId,
});

export const createOrdersRepository = (pool: Pool) => ({
  /**
   * Newest first. With a search, an order is kept when its title contains the text or its id is one of
   * `matchingIds` (the orders whose products matched; the products module finds them).
   */
  async list(search?: { query: string; matchingIds: readonly number[] }): Promise<Order[]> {
    let where = '';
    const params: (string | number[])[] = [];
    if (search) {
      where = 'WHERE title LIKE ?';
      params.push(containsPattern(search.query));
      if (search.matchingIds.length > 0) {
        where += ' OR id IN (?)';
        params.push([...search.matchingIds]);
      }
    }
    const [rows] = await pool.query<OrderRow[]>(
      `SELECT id, title, description, date, warehouse_id AS warehouseId FROM orders ${where} ORDER BY date DESC, id DESC`,
      params,
    );
    return rows.map(toOrder);
  },

  async findById(id: number): Promise<Order | undefined> {
    const [rows] = await pool.query<OrderRow[]>(
      'SELECT id, title, description, date, warehouse_id AS warehouseId FROM orders WHERE id = ?',
      [id],
    );
    const row = rows[0];
    return row ? toOrder(row) : undefined;
  },

  async create(input: OrderInput): Promise<Order> {
    try {
      const [result] = await pool.query<ResultSetHeader>(
        'INSERT INTO orders (title, description, date, warehouse_id) VALUES (?, ?, ?, ?)',
        [input.title, input.description, input.date, input.warehouseId ?? null],
      );
      return { id: result.insertId, ...input, warehouseId: input.warehouseId ?? null };
    } catch (error) {
      throw asForeignKeyViolation(error) ?? error;
    }
  },

  /** Products of the order and their prices are removed by `ON DELETE CASCADE`. */
  async remove(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM orders WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
});

export type OrdersRepository = ReturnType<typeof createOrdersRepository>;
