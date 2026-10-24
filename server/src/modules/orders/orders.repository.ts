import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import type { Pool } from '../../shared/db/pool.js';
import type { Order, OrderInput } from './orders.types.js';

interface OrderRow extends RowDataPacket, Order {}

const toOrder = ({ id, title, description, date }: OrderRow): Order => ({
  id,
  title,
  description,
  date,
});

export const createOrdersRepository = (pool: Pool) => ({
  /** Newest first. */
  async list(): Promise<Order[]> {
    const [rows] = await pool.query<OrderRow[]>(
      'SELECT id, title, description, date FROM orders ORDER BY date DESC, id DESC',
    );
    return rows.map(toOrder);
  },

  async findById(id: number): Promise<Order | undefined> {
    const [rows] = await pool.query<OrderRow[]>(
      'SELECT id, title, description, date FROM orders WHERE id = ?',
      [id],
    );
    const row = rows[0];
    return row ? toOrder(row) : undefined;
  },

  async create(input: OrderInput): Promise<Order> {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO orders (title, description, date) VALUES (?, ?, ?)',
      [input.title, input.description, input.date],
    );
    return { id: result.insertId, ...input };
  },

  /** Products of the order and their prices are removed by `ON DELETE CASCADE`. */
  async remove(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM orders WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
});

export type OrdersRepository = ReturnType<typeof createOrdersRepository>;
